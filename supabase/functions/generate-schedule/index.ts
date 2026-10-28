// supabase/functions/generate-schedule/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BlockSchema = z.object({
  task_id: z.string().nullable().optional(),
  task_title: z.string(),
  kind: z.enum(["work", "break"]),
  start_at: z.string(),
  end_at: z.string(),
  chunk_index: z.number().int().min(1).catch(1),
});

const PlanSchema = z.object({
  summary: z.string(),
  blocks: z.array(BlockSchema).min(1),
});

function toLocal(date: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second")
    )
  );
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function violatesSleep(
  start: Date,
  end: Date,
  sleepStart: string,
  sleepEnd: string,
  tz: string
) {
  const s = toLocal(start, tz);
  const e = toLocal(end, tz);
  const [sh, sm] = sleepStart.split(":").map(Number);
  const [eh, em] = sleepEnd.split(":").map(Number);

  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const day = new Date(s);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    day.setUTCHours(0, 0, 0, 0);

    const ws = new Date(day);
    ws.setUTCHours(sh, sm, 0, 0);
    const we = new Date(day);
    we.setUTCHours(eh, em, 0, 0);
    if (we <= ws) we.setUTCDate(we.getUTCDate() + 1);

    if (overlaps(s, e, ws, we)) return true;
  }
  return false;
}

function hitsFixed(
  start: Date,
  end: Date,
  fixed: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  tz: string
) {
  const s = toLocal(start, tz);
  const e = toLocal(end, tz);

  const cursor = new Date(s);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(e);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const jsDay = cursor.getUTCDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;

    for (const f of fixed) {
      if (isoDay !== f.day_of_week) continue;
      const [sh, sm] = f.start_time.split(":").map(Number);
      const [eh, em] = f.end_time.split(":").map(Number);

      const fs = new Date(cursor);
      fs.setUTCHours(sh, sm, 0, 0);
      const fe = new Date(cursor);
      fe.setUTCHours(eh, em, 0, 0);

      if (overlaps(s, e, fs, fe)) return true;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    if (!apiKey) {
      return json(
        {
          error:
            "GEMINI_API_KEY belum diset. Buka Supabase Dashboard → Edge Functions → Secrets.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const dailyLimit = Number(Deno.env.get("AI_DAILY_LIMIT") || 30);
    const { data: allowed } = await supabaseAdmin.rpc("consume_ai_quota", {
      p_user: user.id,
      p_feature: "suggest_reschedule",
      p_daily_limit: dailyLimit,
    });
    if (!allowed) return json({ error: "Kuota AI harian habis" }, 429);

    const body = await req.json();
    const {
      tasks = [],
      fixed_schedules = [],
      preferences = {},
      horizon_start,
      horizon_end,
      now = new Date().toISOString(),
    } = body;

    if (!tasks?.length)
      return json({ error: "Tidak ada tugas untuk dijadwalkan" }, 400);
    if (!horizon_start || !horizon_end)
      return json({ error: "horizon_start/horizon_end wajib diisi" }, 400);

    const tz = preferences.timezone || "Asia/Jakarta";
    const sleepStart = preferences.sleep_start || "22:00";
    const sleepEnd = preferences.sleep_end || "06:00";
    const workBlock = preferences.work_block_minutes || 50;
    const breakMin = preferences.break_minutes || 10;
    const maxDaily = preferences.max_daily_work_minutes || 480;

    const taskLines = tasks
      .map(
        (t: any, i: number) =>
          `${i + 1}. id=${t.id} | "${t.title}" | ${t.estimated_minutes} menit | deadline=${
            t.deadline || "tanpa deadline"
          } | prioritas=${t.priority_score ?? "-"} | kategori=${t.category}`
      )
      .join("\n");

    const fixedLines = fixed_schedules.length
      ? fixed_schedules
          .map(
            (f: any) =>
              `- Hari ${f.day_of_week} ${f.start_time}-${f.end_time} (${f.title})`
          )
          .join("\n")
      : "- Tidak ada jadwal tetap";

    const prompt = `Anda adalah penjadwal akademik untuk mahasiswa.
Susun jadwal kerja dari tugas-tugas berikut ke dalam blok waktu.

ATURAN WAJIB:
- Zona waktu: ${tz}.
- WAKTU SAAT INI: ${now}. DILARANG menjadwalkan blok SEBELUM waktu ini.
- Jam tidur: ${sleepStart} - ${sleepEnd}. DILARANG menaruh blok kerja di jam ini.
- Work block maksimal ${workBlock} menit, jeda ${breakMin} menit antar sesi.
- Total kerja per hari maksimal ${maxDaily} menit.
- Jangan bentrok dengan jadwal tetap berikut:
${fixedLines}
- Hormati deadline. Prioritaskan tugas dengan skor prioritas lebih tinggi.
- Jika tugas lebih lama dari work block, pecah menjadi beberapa chunk (chunk_index mulai dari 1).
- start_at dan end_at WAJIB ISO 8601 dengan timezone, contoh: 2026-10-29T08:00:00+07:00.
- task_id HARUS sama persis dengan id tugas dari daftar di bawah.
- Kembalikan JSON dengan skema:
{
  "summary": "ringkasan 1 kalimat",
  "blocks": [
    {"task_id": "uuid", "task_title": "judul", "kind": "work", "start_at": "ISO", "end_at": "ISO", "chunk_index": 1}
  ]
}

Daftar tugas (urut dari prioritas tertinggi):
${taskLines}

Horizon: ${horizon_start} sampai ${horizon_end}.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                blocks: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      task_id: { type: "STRING" },
                      task_title: { type: "STRING" },
                      kind: { type: "STRING", enum: ["work", "break"] },
                      start_at: { type: "STRING" },
                      end_at: { type: "STRING" },
                      chunk_index: { type: "INTEGER" },
                    },
                    required: ["task_id", "task_title", "kind", "start_at", "end_at"],
                  },
                },
              },
              required: ["summary", "blocks"],
            },
          },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return json({ error: "Gemini gagal: " + err }, 502);
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return json({ error: "Respons Gemini kosong" }, 502);

    let jsonParsed: any;
    try {
      jsonParsed = JSON.parse(rawText);
    } catch {
      return json(
        { error: "Output Gemini bukan JSON valid", raw: rawText.slice(0, 500) },
        422
      );
    }

    const parsed = PlanSchema.safeParse(jsonParsed);
    if (!parsed.success) {
      return json(
        { error: "Output AI tidak valid", detail: parsed.error.format() },
        422
      );
    }

    const userTaskIds = new Set(tasks.map((t: any) => t.id));
    const userTaskMap = new Map(tasks.map((t: any) => [t.id, t]));

    const sanitizedBlocks = parsed.data.blocks.map((b) => ({
      ...b,
      task_id: b.task_id && userTaskIds.has(b.task_id) ? b.task_id : null,
    }));

    const errors: string[] = [];
    const warnings: string[] = [];
    const nowMs = new Date(now).getTime();

    for (const b of sanitizedBlocks) {
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        errors.push(`Blok "${b.task_title}" memiliki tanggal tidak valid`);
        continue;
      }
      
      // Cegah jadwal di masa lalu (toleransi 15 menit)
      if (s.getTime() < nowMs - 15 * 60000) {
        errors.push(`Blok "${b.task_title}" dijadwalkan di masa lalu (${s.toLocaleString("id-ID")})`);
      }
      if (e <= s) errors.push(`Blok "${b.task_title}" end_at <= start_at`);
    }

    const sorted = [...sanitizedBlocks].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      if (new Date(sorted[i].start_at) < new Date(sorted[i - 1].end_at)) {
        errors.push(
          `Blok "${sorted[i].task_title}" bentrok dengan blok sebelumnya`
        );
      }
    }

    const dailyMinutes = new Map<string, number>();
    for (const b of sanitizedBlocks) {
      if (b.kind !== "work") continue;
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) continue;

      if (violatesSleep(s, e, sleepStart, sleepEnd, tz)) {
        errors.push(`Blok "${b.task_title}" menyentuh jam tidur`);
      }
      if (hitsFixed(s, e, fixed_schedules, tz)) {
        errors.push(`Blok "${b.task_title}" bentrok dengan jadwal tetap`);
      }

      if (b.task_id) {
        const task = userTaskMap.get(b.task_id) as any;
        if (task?.deadline) {
          const deadlineMs = new Date(task.deadline).getTime();
          // Lewati pengecekan untuk tugas yang sudah overdue
          if (deadlineMs > nowMs && e.getTime() > deadlineMs) {
            warnings.push(`"${b.task_title}" dijadwalkan melewati deadline`);
          }
        }
      }

      const dayKey = toLocal(s, tz).toISOString().slice(0, 10);
      const dur = Math.round((e.getTime() - s.getTime()) / 60000);
      dailyMinutes.set(dayKey, (dailyMinutes.get(dayKey) || 0) + dur);
    }

    for (const [day, mins] of dailyMinutes) {
      if (mins > maxDaily) {
        warnings.push(
          `Total kerja pada ${day} melebihi batas ${maxDaily} menit (${mins} menit)`
        );
      }
    }

    if (errors.length) {
      return json(
        { error: "Usulan jadwal melanggar aturan", violations: errors },
        422
      );
    }

    // Simpan sebagai 'proposed' terlebih dahulu. Frontend yang akan menyetujui via RPC
    const { data: plan, error: planError } = await supabaseAdmin
      .from("schedule_plans")
      .insert({
        user_id: user.id,
        status: "proposed", // Wajib proposed
        generated_by: "ai",
        horizon_start,
        horizon_end,
        summary: parsed.data.summary,
      })
      .select()
      .single();

    if (planError) throw planError;

    try {
      const rows = sanitizedBlocks.map((b) => ({
        plan_id: plan.id,
        user_id: user.id,
        task_id: b.task_id,
        task_title: b.task_title,
        kind: b.kind,
        start_at: b.start_at,
        end_at: b.end_at,
        chunk_index: b.chunk_index,
      }));

      const { error: blockError } = await supabaseAdmin
        .from("scheduled_blocks")
        .insert(rows);
      if (blockError) throw blockError;

      return json({
        plan: { ...plan, status: "proposed" },
        blocks: rows,
        summary: parsed.data.summary,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (e: any) {
      // Rollback jika insert blok gagal
      await supabaseAdmin.from("schedule_plans").delete().eq("id", plan.id);
      throw e;
    }
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});