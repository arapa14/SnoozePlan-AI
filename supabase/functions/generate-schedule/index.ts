// supabase/functions/generate-schedule/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BlockSchema = z.object({
  task_id: z.string().nullable().optional(),
  task_title: z.string().optional(),
  kind: z.enum(["work", "break"]).default("work"),
  start_at: z.string(),
  end_at: z.string(),
  chunk_index: z.number().int().min(1).catch(1),
});

const PlanSchema = z.object({
  summary: z.string().default("Jadwal disusun oleh AI"),
  blocks: z.array(BlockSchema).min(1),
});

function toLocal(date: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second")));
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function violatesSleep(start: Date, end: Date, sleepStart: string, sleepEnd: string, tz: string) {
  const s = toLocal(start, tz);
  const e = toLocal(end, tz);
  const [sh, sm] = sleepStart.split(":").map(Number);
  const [eh, em] = sleepEnd.split(":").map(Number);

  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const day = new Date(s);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    day.setUTCHours(0, 0, 0, 0);
    const ws = new Date(day); ws.setUTCHours(sh, sm, 0, 0);
    const we = new Date(day); we.setUTCHours(eh, em, 0, 0);
    if (we <= ws) we.setUTCDate(we.getUTCDate() + 1);
    if (overlaps(s, e, ws, we)) return true;
  }
  return false;
}

function hitsFixed(start: Date, end: Date, fixed: any[], tz: string) {
  const s = toLocal(start, tz);
  const e = toLocal(end, tz);
  const cursor = new Date(s); cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(e); endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const isoDay = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    for (const f of fixed) {
      if (isoDay !== f.day_of_week) continue;
      const [sh, sm] = f.start_time.split(":").map(Number);
      const [eh, em] = f.end_time.split(":").map(Number);
      const fs = new Date(cursor); fs.setUTCHours(sh, sm, 0, 0);
      const fe = new Date(cursor); fe.setUTCHours(eh, em, 0, 0);
      if (overlaps(s, e, fs, fe)) return true;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function extractJson(text: string) {
  if (!text) return "";
  const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) return cleanText.substring(firstBrace, lastBrace + 1);
  return cleanText;
}

function repairTruncated(text: string) {
  const start = text.indexOf("{");
  const src = start === -1 ? text : text.slice(start);
  const idx = src.lastIndexOf("},");
  if (idx === -1) {
    const last = src.lastIndexOf("}");
    if (last === -1) return src;
    return src.slice(0, last + 1) + "]}";
  }
  return src.slice(0, idx + 1) + "]}";
}

// ===== HELPER: API CALLERS =====
async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json", maxOutputTokens: 8192, temperature: 0.1,
        responseSchema: {
          type: "OBJECT", properties: {
            summary: { type: "STRING" },
            blocks: { type: "ARRAY", items: { type: "OBJECT", properties: { task_id: { type: "STRING" }, kind: { type: "STRING", enum: ["work", "break"] }, start_at: { type: "STRING" }, end_at: { type: "STRING" }, chunk_index: { type: "INTEGER" } }, required: ["task_id", "kind", "start_at", "end_at"] } },
          }, required: ["summary", "blocks"],
        },
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`Gemini Error: ${await res.text()}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts ?? []).filter((p: any) => !p.thought).map((p: any) => p.text ?? "").join("");
}

async function callGroq(prompt: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: "Anda adalah penjadwal akademik. Kembalikan HANYA JSON object murni." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" }, temperature: 0.1,
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`Groq Error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://snoozeplan.vercel.app", "X-Title": "SnoozePlan AI" },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: "Anda adalah penjadwal akademik. Kembalikan HANYA JSON object murni." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" }, temperature: 0.1,
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`OpenRouter Error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ===== MAIN FUNCTION =====
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parseKeys = (envVar: string | undefined) => {
      if (!envVar) return [];
      return envVar.split(",").map(k => k.trim()).filter(k => k.length > 0);
    };

    const geminiKeys = parseKeys(Deno.env.get("GEMINI_API_KEY"));
    const groqKeys = parseKeys(Deno.env.get("GROQ_API_KEY"));
    const openRouterKeys = parseKeys(Deno.env.get("OPENROUTER_API_KEY"));
    
    if (geminiKeys.length === 0 && groqKeys.length === 0 && openRouterKeys.length === 0) {
      return json({ error: "Sistem Error: Tidak ada API Key AI yang diset." }, 500);
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const dailyLimit = Number(Deno.env.get("AI_DAILY_LIMIT") || 30);
    const { data: allowed } = await supabaseAdmin.rpc("consume_ai_quota", { p_user: user.id, p_feature: "suggest_reschedule", p_daily_limit: dailyLimit });
    if (!allowed) return json({ error: "Kuota AI harian habis" }, 429);

    const body = await req.json();
    const { tasks = [], fixed_schedules = [], fixed_events = [], preferences = {}, horizon_start, horizon_end, now = new Date().toISOString() } = body;

    if (!tasks?.length) return json({ error: "Tidak ada tugas untuk dijadwalkan" }, 400);
    if (!horizon_start || !horizon_end) return json({ error: "horizon_start/horizon_end wajib diisi" }, 400);

    const tz = preferences.timezone || "Asia/Jakarta";
    const sleepStart = preferences.sleep_start || "22:00";
    const sleepEnd = preferences.sleep_end || "06:00";
    const workBlock = preferences.work_block_minutes || 50;
    const breakMin = preferences.break_minutes || 10;
    const maxDaily = preferences.max_daily_work_minutes || 480;

    const nowMs = new Date(now).getTime();
    const nowLocal = new Date(now).toLocaleString("id-ID", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const nowPlus15 = new Date(new Date(now).getTime() + 15 * 60000).toLocaleString("id-ID", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const taskLines = tasks.map((t: any, i: number) => {
      const isOverdue = t.deadline && new Date(t.deadline).getTime() < nowMs;
      return `${i + 1}. id=${t.id} | "${t.title}" | ${t.estimated_minutes} menit | deadline=${t.deadline ? new Date(t.deadline).toLocaleString("id-ID", { timeZone: tz }) : "tanpa deadline"} ${isOverdue ? "[TERLAMBAT]" : ""} | prioritas=${t.priority_score ?? "-"} | kategori=${t.category}`;
    }).join("\n");

    const fixedLines = fixed_schedules.length ? fixed_schedules.map((f: any) => `- Hari ${f.day_of_week} ${f.start_time}-${f.end_time} (${f.title})`).join("\n") : "- Tidak ada jadwal tetap";
    const eventLines = fixed_events.length ? fixed_events.map((e: any) => `- "${e.title}": ${new Date(e.start_at).toLocaleString("id-ID", { timeZone: tz })} s/d ${new Date(e.end_at).toLocaleString("id-ID", { timeZone: tz })}`).join("\n") : "- Tidak ada agenda tetap";

    // UBAH PROMPT: Gunakan kalimat afirmatif agar AI gratis lebih patuh
    const prompt = `Anda adalah penjadwal akademik untuk mahasiswa.
Susun jadwal kerja dari tugas-tugas berikut ke dalam blok waktu.

ATURAN WAKTU (SANGAT KETAT):
- Zona waktu target: ${tz}.
- WAKTU SAAT INI adalah: ${nowLocal}.
- JADWALKAN HANYA PADA WAKTU SETELAH JAM ${nowPlus15}. 
- Jika tugas berlabel [TERLAMBAT], JANGAN gunakan deadline aslinya. Jadwalkan tugas tersebut pada slot kosong PERTAMA setelah ${nowPlus15}.

ATURAN JAM KERJA (PATUHI INI):
- JAM KERJA YANG DIIZINKAN HANYA DARI JAM ${sleepEnd} PAGI SAMPAI JAM ${sleepStart} MALAM.
- JANGAN PERNAH membuat jadwal di luar jam tersebut (misal tengah malam atau dini hari).
- Work block maksimal ${workBlock} menit, berikan jeda ${breakMin} menit antar sesi kerja.
- Total kerja per hari maksimal ${maxDaily} menit.
- Jangan bentrok dengan jadwal kuliah tetap berikut:
${fixedLines}
- JANGAN BENTROK DENGAN AGENDA BERIKUT:
${eventLines}
- Jika tugas lebih lama dari work block, pecah menjadi beberapa chunk (chunk_index mulai dari 1).
- start_at dan end_at WAJIB ISO 8601 dengan offset zona waktu, contoh: 2026-10-29T08:00:00+07:00.
- task_id HARUS sama persis dengan id tugas dari daftar di bawah.

KEMBALIKAN HANYA JSON OBJECT MURNI. Format:
{
  "summary": "ringkasan 1 kalimat",
  "blocks": [
    {"task_id": "uuid", "kind": "work", "start_at": "ISO", "end_at": "ISO", "chunk_index": 1}
  ]
}

Daftar tugas:
${taskLines}

Horizon: ${horizon_start} sampai ${horizon_end}.`;

    // 5. PROSES FALLBACK (Looping Provider -> Model -> API Key)
    let rawText = "";
    let modelUsed = "";
    let allErrors: string[] = [];

    // TIDAK DIUBAH SESUAI PERMINTAAN
    const providerConfigs = [
      { 
        name: "gemini", 
        keys: geminiKeys, 
        models: ["gemini-3.5-flash", "gemini-3.5-flash-lite"], 
        fetchFn: callGemini 
      },
      { 
        name: "groq", 
        keys: groqKeys, 
        models: ["openai/gpt-oss-20b", "llama3-8b-8192", "mixtral-8x7b-32768"], 
        fetchFn: callGroq 
      },
      { 
        name: "openrouter", 
        keys: openRouterKeys, 
        models: ["google/gemma-2-9b-it:free", "meta-llama/llama-3-8b-instruct:free"], 
        fetchFn: callOpenRouter 
      }
    ];

    for (const provider of providerConfigs) {
      if (provider.keys.length === 0) continue;

      for (const model of provider.models) {
        for (let i = 0; i < provider.keys.length; i++) {
          const key = provider.keys[i];

          try {
            console.log(`Mencoba ${provider.name} [Model: ${model}] Key ke-${i + 1}...`);
            rawText = await provider.fetchFn(prompt, key, model);
            modelUsed = `${provider.name} (Key ${i + 1}) - ${model}`;
            console.log(`✅ Berhasil: ${modelUsed}`);
            break; 
          } catch (err: any) {
            console.warn(`❌ Gagal di ${provider.name} [Model: ${model}] Key ke-${i + 1}:`, err.message.substring(0, 100));
            allErrors.push(`${provider.name} (${model}): ${err.message.substring(0, 50)}...`);
          }
        }
        if (rawText) break;
      }
      if (rawText) break;
    }

    if (!rawText) {
      return json({ 
        error: "Semua provider, model, dan API Key AI gagal atau limit.", 
        detail: allErrors.join(" | ")
      }, 502);
    }

    // 6. PARSING & VALIDASI OUTPUT AI
    let errors: string[] = [];
    let warnings: string[] = [];

    let jsonParsed: any;
    const cleanJson = extractJson(rawText);
    try {
      jsonParsed = JSON.parse(cleanJson);
    } catch (_err) {
      try {
        jsonParsed = JSON.parse(repairTruncated(cleanJson));
        warnings.push("Jadwal tidak lengkap karena output AI terpotong.");
      } catch (_err2) {
        return json({ error: "Output AI bukan JSON valid", raw: rawText.slice(0, 500) }, 422);
      }
    }

    const parsed = PlanSchema.safeParse(jsonParsed);
    if (!parsed.success) return json({ error: "Format JSON dari AI tidak sesuai skema", detail: parsed.error.format() }, 422);

    const userTaskIds = new Set(tasks.map((t: any) => t.id));
    const userTaskMap = new Map(tasks.map((t: any) => [t.id, t]));

    const sanitizedBlocks = parsed.data.blocks.map((b) => {
      const validId = b.task_id && userTaskIds.has(b.task_id) ? b.task_id : null;
      const task = validId ? (userTaskMap.get(validId) as any) : null;
      return {
        ...b,
        task_id: validId,
        task_title: task?.title ?? b.task_title ?? "Tugas",
      };
    });

    // 7. VALIDASI DETERMINISTIK & AUTO-CORRECT
    for (const ev of fixed_events) {
      const evStart = new Date(ev.start_at);
      const evEnd = new Date(ev.end_at);
      if (violatesSleep(evStart, evEnd, sleepStart, sleepEnd, tz)) {
        errors.push(`Agenda Tetap "${ev.title}" berada di dalam jam tidur Anda. Harap ubah waktu agenda tersebut di menu Edit.`);
      }
    }

    if (errors.length) {
      return json({ error: "Terdapat agenda yang melanggar aturan jam tidur", violations: errors }, 422);
    }
    
    for (const b of sanitizedBlocks) {
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        errors.push(`Blok "${b.task_title}" tanggal tidak valid`);
        continue;
      }
      if (s.getTime() < nowMs - 15 * 60000) errors.push(`Blok "${b.task_title}" dijadwalkan di masa lalu`);
      if (e <= s) errors.push(`Blok "${b.task_title}" end_at <= start_at`);
    }

    // AUTO CORRECT: Jika AI tetap menjadwalkan di jam tidur, kita pindahkan paksa ke jam setelah bangun
    for (const b of sanitizedBlocks) {
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      
      if (violatesSleep(s, e, sleepStart, sleepEnd, tz)) {
        // Hitung durasi asli
        const durationMins = Math.round((e.getTime() - s.getTime()) / 60000);
        
        // Buat waktu baru (Jam bangun tidur + 15 menit)
        const sLocal = toLocal(s, tz);
        const [eh, em] = sleepEnd.split(":").map(Number);
        
        const wakeUpTime = new Date(sLocal);
        wakeUpTime.setUTCHours(eh, em + 15, 0, 0);
        
        // Geser blok
        b.start_at = wakeUpTime.toISOString();
        b.end_at = new Date(wakeUpTime.getTime() + durationMins * 60000).toISOString();
        
        warnings.push(`"${b.task_title}" digeser otomatis ke jam ${sleepEnd} karena AI menaruhnya di jam tidur.`);
      }
    }

    // Cek Bentrok Agenda
    for (const b of sanitizedBlocks) {
      if (b.kind !== "work") continue;
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) continue;

      for (const ev of fixed_events) {
        if (overlaps(s, e, new Date(ev.start_at), new Date(ev.end_at))) {
          errors.push(`Blok "${b.task_title}" bentrok dengan agenda "${ev.title}"`);
        }
      }
    }

    // Cek Bentrok antar sesama Blok
    const sorted = [...sanitizedBlocks].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (new Date(sorted[i].start_at) < new Date(sorted[i - 1].end_at)) {
        errors.push(`Blok "${sorted[i].task_title}" bentrok dengan blok sebelumnya`);
      }
    }

    // Cek Bentrok dengan Jam Kuliah & Deadline
    const dailyMinutes = new Map<string, number>();
    for (const b of sanitizedBlocks) {
      if (b.kind !== "work") continue;
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) continue;

      if (hitsFixed(s, e, fixed_schedules, tz)) errors.push(`Blok "${b.task_title}" bentrok dengan jadwal kuliah`);

      if (b.task_id) {
        const task = userTaskMap.get(b.task_id) as any;
        if (task?.deadline) {
          const deadlineMs = new Date(task.deadline).getTime();
          if (deadlineMs > nowMs && e.getTime() > deadlineMs) warnings.push(`"${b.task_title}" melewati deadline`);
        }
      }

      const dayKey = toLocal(s, tz).toISOString().slice(0, 10);
      const dur = Math.round((e.getTime() - s.getTime()) / 60000);
      dailyMinutes.set(dayKey, (dailyMinutes.get(dayKey) || 0) + dur);
    }

    for (const [day, mins] of dailyMinutes) {
      if (mins > maxDaily) warnings.push(`Total kerja pada ${day} melebihi batas (${mins} menit)`);
    }

    // Jika masih ada error (seperti bentrok jadwal), lempar 422
    if (errors.length) return json({ error: "Usulan jadwal melanggar aturan", violations: errors }, 422);

    // 8. SIMPAN KE DATABASE
    const { data: plan, error: planError } = await supabaseAdmin
      .from("schedule_plans")
      .insert({ user_id: user.id, status: "proposed", generated_by: "ai", horizon_start, horizon_end, summary: parsed.data.summary })
      .select().single();

    if (planError) throw planError;

    try {
      const rows = sanitizedBlocks.map((b) => ({
        plan_id: plan.id, user_id: user.id, task_id: b.task_id, task_title: b.task_title,
        kind: b.kind, start_at: b.start_at, end_at: b.end_at, chunk_index: b.chunk_index,
      }));

      const { error: blockError } = await supabaseAdmin.from("scheduled_blocks").insert(rows);
      if (blockError) throw blockError;

      return json({ 
        plan: { ...plan, status: "proposed" }, 
        blocks: rows, 
        summary: parsed.data.summary, 
        warnings: warnings.length > 0 ? warnings : undefined,
        modelUsed 
      });
    } catch (e: any) {
      await supabaseAdmin.from("schedule_plans").delete().eq("id", plan.id);
      throw e;
    }
  } catch (err: any) {
    console.error("Global Error:", err);
    return json({ error: err.message || "Internal Server Error" }, 500);
  }
});