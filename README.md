# SnoozePlan AI

**To-Do List cerdas untuk mahasiswa FMIPA UNJ: tugas diurutkan otomatis berdasarkan prioritas, dan jadwal disusun ulang tanpa mengorbankan waktu tidur.**

SnoozePlan AI adalah aplikasi web *to-do list* yang dibangun bertahap. Tahap awal berupa to-do list biasa yang sudah berfungsi penuh. Setelah itu ditambahkan mesin prioritas, penjadwalan slot waktu, lalu integrasi **Gemini API** untuk input bahasa natural, penjelasan prioritas, dan *rescheduling* cerdas.

> Proyek ini merupakan bagian dari penelitian KPM UNJ 2026 (Bidang Teknologi): *"SnoozePlan AI: Pengembangan Sistem Penjadwalan Cerdas Berbasis Machine Learning guna Optimalisasi Prioritas Rescheduling Mahasiswa FMIPA UNJ"*.

---

## Daftar Isi

1. [Konsep Inti](#konsep-inti)
2. [Fitur Utama](#fitur-utama)
3. [Cara Kerja Prioritas (Adaptive Priority Scoring)](#cara-kerja-prioritas-adaptive-priority-scoring)
4. [Peran AI dalam Sistem](#peran-ai-dalam-sistem)
5. [Alur Pengguna](#alur-pengguna)
6. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
7. [Struktur Direktori](#struktur-direktori)
8. [Model Data](#model-data)
9. [Panduan Pengembangan Bertahap](#panduan-pengembangan-bertahap)
10. [Instalasi & Menjalankan Lokal](#instalasi--menjalankan-lokal)
11. [Variabel Lingkungan & Secrets](#variabel-lingkungan--secrets)
12. [Keamanan & Batasan](#keamanan--batasan)
13. [Deployment](#deployment)
14. [Roadmap](#roadmap)
15. [Tim & Lisensi](#tim--lisensi)

---

## Konsep Inti

Aplikasi ini adalah **to-do list**, bukan kalender penuh. Setiap tugas hanya butuh beberapa isian sederhana, dan sisanya dikerjakan sistem:

```text
Catat tugas  →  Skor prioritas otomatis  →  Daftar tugas terurut  →  Slot waktu disarankan
                                                      ↑
                         Jadwal berubah? → Smart Rescheduling (sekali klik)
```

**Masalah yang diselesaikan** (berdasarkan analisis kebutuhan mahasiswa FMIPA UNJ):

- Tugas, laporan praktikum, dan kuis menumpuk dalam waktu berdekatan.
- Perubahan jadwal mendadak memicu efek domino pada kegiatan lain.
- Sulit menentukan tugas mana yang harus dikerjakan lebih dulu.
- Waktu istirahat dan tidur sering dikorbankan.

---

## Fitur Utama

| Fitur | Deskripsi | Tahap |
|-------|-----------|-------|
| **Smart To-Do List** | Tambah, ubah, selesaikan, dan kelompokkan tugas (kuliah, praktikum, organisasi, pribadi) dengan tenggat, tingkat kepentingan, dan estimasi durasi. | Fase 1 |
| **Adaptive Priority Scoring** | Skor 0–100 dari lima faktor: urgensi, kepentingan, konsekuensi keterlambatan, kesesuaian durasi, dan ketersediaan waktu. Daftar tugas selalu terurut berdasarkan skor ini. | Fase 2 |
| **Work & Rest Optimizer** | Jam tidur minimal dikunci, tugas tidak pernah ditempatkan di zona istirahat, dan jeda disisipkan antar sesi kerja. | Fase 3 |
| **Input Bahasa Natural** | Ketik *"laporan kimia dasar Jumat jam 5"*, Gemini mengubahnya menjadi tugas terstruktur. | Fase 4 |
| **Penjelasan Prioritas** | Alasan singkat tiap tugas, misalnya *"Prioritas tinggi: deadline besok dan durasi 3 jam."* | Fase 5 |
| **Dynamic Smart Rescheduling** | Saat jadwal berubah atau bentrok, tugas terdampak disusun ulang dengan satu klik. | Fase 6 |
| **Diff View (Sebelum/Sesudah)** | Bandingkan jadwal lama dan baru, lalu setujui atau tolak sebelum disimpan. | Fase 6 |
| **Pengingat & Snooze** | Pengingat tugas dengan opsi *snooze*. Hasil snooze menjadi sinyal skor prioritas. | Fase 7 |
| **Estimasi Durasi Personal** | Sistem belajar dari selisih estimasi dan durasi aktual sehingga estimasi makin sesuai kebiasaan pengguna. | Fase 7 |
| **Ringkasan Beban Harian** | Dashboard beban kerja per hari beserta peringatan jika melebihi kapasitas waktu. | Fase 3 |

---

## Cara Kerja Prioritas (Adaptive Priority Scoring)

Skor prioritas dihitung dari lima faktor yang dirumuskan pada penelitian:

| # | Faktor | Arti | Sumber Data |
|---|--------|------|-------------|
| 1 | **Urgensi** | Seberapa dekat tenggat waktu | Dihitung dari `deadline` |
| 2 | **Kepentingan** | Pengaruh tugas terhadap tujuan akademik/pribadi | Input pengguna (1–5), dibantu saran AI |
| 3 | **Konsekuensi keterlambatan** | Dampak jika tugas telat (nilai, sanksi, dll.) | Kategori tugas dan input pengguna (1–5) |
| 4 | **Kesesuaian durasi** | Kecocokan durasi tugas dengan waktu yang tersedia | Input pengguna atau estimasi AI |
| 5 | **Ketersediaan waktu** | Kecocokan tugas dengan waktu luang dan jadwal tetap | Dihitung dari jadwal kuliah dan slot kosong |

```text
Skor = w1·Urgensi + w2·Kepentingan + w3·Konsekuensi + w4·KesesuaianDurasi + w5·Ketersediaan
```

Setiap faktor dinormalisasi ke skala 0–1 lalu dikalikan bobot `w`. Total skor diskalakan ke 0–100.

**Bobot awal (default, perlu dikalibrasi):**

| Bobot | Faktor | Nilai Awal |
|-------|--------|-----------|
| `w1` | Urgensi | 0.30 |
| `w2` | Kepentingan | 0.25 |
| `w3` | Konsekuensi | 0.20 |
| `w4` | Durasi | 0.10 |
| `w5` | Ketersediaan | 0.15 |

> **Catatan metodologis:** nilai bobot di atas hanya titik awal. Bobot dan rumus harus ditentukan serta diuji lebih dulu agar rekomendasi dapat dipertanggungjawabkan, melalui validasi ahli dan uji coba terbatas. Bobot disimpan di konfigurasi dan dapat dipersonalisasi per pengguna.

**Contoh:** tugas A dikumpulkan besok dan butuh 3 jam, sedangkan tugas B dikumpulkan 5 hari lagi dan butuh 1 jam. Jika hanya durasi yang dilihat, B akan dikerjakan lebih dulu (seperti aturan SPT). Karena urgensi dan konsekuensi ikut dihitung, **A tetap mendapat prioritas lebih tinggi**.

---

## Peran AI dalam Sistem

Sistem menggunakan **pendekatan hibrida**. Logika deterministik (aturan dan skor berbobot) adalah mekanisme utama dan **berjalan tanpa AI**. Gemini ditambahkan sebagai lapisan yang memahami bahasa natural dan mengusulkan perubahan.

| Komponen | Teknik | Tugas |
|----------|--------|-------|
| **Priority & Constraint Engine** | TypeScript murni, skor berbobot (EDD sebagai acuan urgensi) | Menghitung skor dan menegakkan batasan: jadwal kuliah, jam tidur, tenggat tetap. |
| **Slot Planner + Sleep-Guard** | TypeScript murni | Mencari slot kosong dan menolak penempatan di zona istirahat. |
| **Duration Estimator** | Statistik ringan atas riwayat durasi aktual (rasio `actual/estimated`, *exponential moving average*) | Memperbaiki estimasi durasi per kategori dan per pengguna. |
| **Gemini API (LLM)** | `gemini-2.5-flash` dengan *Structured JSON Output*, dipanggil lewat Supabase Edge Function | Parsing input natural, saran kepentingan/estimasi, usulan rescheduling, penjelasan prioritas. |
| **Validator** | Zod + fungsi deterministik | Memeriksa setiap keluaran AI. Usulan yang melanggar jam tidur, bentrok dengan kuliah, atau melewati tenggat ditolak. |

**Prinsip keamanan:** AI hanya *mengusulkan*, tidak pernah menyimpan jadwal langsung. Jadwal baru disimpan setelah lolos validator dan disetujui pengguna lewat Diff View.

---

## Alur Pengguna

```text
1. Daftar / Masuk
2. Atur profil: jam tidur (default 6–8 jam), jam kuliah tetap, jam aktif harian
3. Tambah tugas (form cepat atau ketik bahasa natural)
4. Sistem menampilkan daftar tugas terurut + slot kerja yang disarankan
5. Kerjakan tugas → tandai selesai → catat durasi aktual (data belajar sistem)
6. Jadwal berubah / tugas baru mendadak?
      → klik "Susun Ulang"
      → lihat Diff View (sebelum vs sesudah)
      → Setujui atau Tolak
```

---

## Arsitektur & Tech Stack

Aplikasi hanya terdiri dari **React dan Supabase**. Tidak ada server backend terpisah.

| Lapisan | Teknologi | Hosting |
|---------|-----------|---------|
| **Frontend** | React (Vite) + TypeScript, Tailwind CSS, Lucide React | Vercel |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Supabase Auth) | Supabase Cloud |
| **Backend logic** | Supabase Edge Functions (Deno + TypeScript) | Supabase Cloud |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`) dengan *Structured Output*, dipanggil hanya dari Edge Function | Google AI Studio |
| **Validasi skema** | Zod | Frontend + Edge Function |

### Pembagian tanggung jawab

| Kebutuhan | Dikerjakan oleh |
|-----------|-----------------|
| CRUD tugas, profil, jadwal tetap | `supabase-js` langsung dari React, diamankan RLS |
| Skor prioritas, Sleep-Guard, Slot Planner | Modul TypeScript `shared/` (dipakai frontend dan Edge Function) |
| Panggilan Gemini (butuh API key rahasia) | Edge Function |
| Validasi keluaran AI | Zod + `shared/` di Edge Function |
| Pembatasan pemakaian AI | Tabel `ai_usage` dicek di awal Edge Function |

### Diagram Alur Sistem

```text
[React + TypeScript (Vercel)]
     │                    │
     │ supabase-js        │ supabase.functions.invoke()
     │ (CRUD + RLS)       │ (JWT pengguna otomatis dikirim)
     ▼                    ▼
[Supabase PostgreSQL]  [Edge Functions (Deno)]
     ▲                    ├── parse-task ─────────┐
     │                    ├── explain-priority ───┼──► [Gemini API]
     │                    ├── suggest-reschedule ─┘
     │                    ├── Validator (Zod + shared/)
     │                    └── Cek kuota (ai_usage)
     │                    │
     └────────────────────┘
                          │
                          ▼
[Diff View → persetujuan pengguna → simpan jadwal baru (RPC)]
```

---

## Struktur Direktori

```text
snoozeplan-ai/
├── frontend/                          # React + TypeScript (Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── tasks/                 # TaskList, TaskCard, TaskForm, PriorityBadge, NaturalInput
│   │   │   ├── schedule/              # DayTimeline, SleepGuardBlock, WorkloadBar
│   │   │   └── reschedule/            # DiffView, ReschedulePanel
│   │   ├── contexts/                  # AuthProvider (Supabase)
│   │   ├── hooks/                     # useTasks, useSchedule, useReschedule, useAI
│   │   ├── lib/                       # Klien Supabase, pemanggil Edge Function
│   │   ├── pages/                     # Landing, Dashboard, Tasks, Schedule, Settings
│   │   └── types/                     # Tipe TypeScript bersama
│   ├── .env.example
│   ├── vercel.json                    # Konfigurasi SPA rewrite
│   └── package.json
├── shared/                            # TypeScript murni, tanpa dependensi framework
│   ├── priority.ts                    # Adaptive Priority Scoring
│   ├── sleepGuard.ts                  # Penegak zona istirahat
│   ├── slotPlanner.ts                 # Penempatan tugas ke slot waktu
│   ├── durationEstimator.ts           # Estimasi durasi personal (statistik)
│   ├── validator.ts                   # Aturan validasi usulan jadwal
│   └── types.ts
├── supabase/
│   ├── migrations/                    # SQL: profiles, tasks, fixed_schedules, dll.
│   ├── functions/
│   │   ├── _shared/                   # Helper Edge Function (CORS, klien Gemini, kuota)
│   │   ├── parse-task/                # Bahasa natural → tugas terstruktur
│   │   ├── explain-priority/          # Penjelasan prioritas
│   │   └── suggest-reschedule/        # Usulan rescheduling + validasi
│   └── config.toml
└── README.md
```

> **Catatan berbagi kode:** Vite dan Deno sama-sama bisa mengimpor file TypeScript lewat path relatif. Pakai ekstensi `.ts` pada impor di `shared/`, dan tambahkan alias `@shared` di `vite.config.ts`. Jika ada kendala bundling pada Edge Function, salin `shared/` ke `supabase/functions/_shared/` lewat skrip *prebuild*.

---

## Model Data

| Tabel | Isi Utama |
|-------|-----------|
| `profiles` | `user_id`, jam tidur (`sleep_start`, `sleep_end`, `min_sleep_hours`), jam aktif harian, bobot prioritas personal |
| `tasks` | `title`, `category`, `deadline`, `importance` (1–5), `late_consequence` (1–5), `estimated_minutes`, `status`, `priority_score`, `priority_reason`, `snooze_count` |
| `fixed_schedules` | Jadwal tetap: kuliah, praktikum, agenda organisasi (`day_of_week`, `start_time`, `end_time`) |
| `scheduled_blocks` | Slot kerja hasil penjadwalan: `task_id`, `start_at`, `end_at`, `version` |
| `task_logs` | `estimated_minutes` vs `actual_minutes`, waktu selesai, jumlah snooze (data belajar) |
| `reschedule_history` | Jadwal sebelum dan sesudah, alasan, dan status persetujuan |
| `ai_usage` | `user_id`, `date`, `count` untuk membatasi panggilan AI per hari |

Semua tabel memakai **Row Level Security** sehingga pengguna hanya dapat mengakses datanya sendiri. Contoh kebijakan:

```sql
alter table tasks enable row level security;

create policy "tasks_owner_all" on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Panduan Pengembangan Bertahap

Urutan di bawah dirancang agar **setiap fase menghasilkan aplikasi yang bisa dipakai**. Fase 1–3 sama sekali tidak membutuhkan AI. Gemini baru masuk di Fase 4.

### Fase 0: Persiapan Proyek

- Buat proyek Supabase, repo GitHub, dan inisialisasi Vite + React + TypeScript + Tailwind.
- Pasang Supabase CLI dan jalankan `supabase init`.
- Buat folder `shared/` dan hubungkan alias `@shared`.

**Selesai jika:** `npm run dev` menampilkan halaman kosong dan CLI Supabase terhubung ke proyek.

### Fase 1: To-Do List Biasa (tanpa AI)

Tujuan: aplikasi to-do list yang berfungsi penuh dan data tersimpan aman per pengguna.

- Migrasi tabel `profiles` dan `tasks`, aktifkan RLS.
- Autentikasi: daftar, masuk, keluar (Supabase Auth) dan `AuthProvider`.
- CRUD tugas: tambah, ubah, hapus, tandai selesai.
- Field tugas: judul, kategori, tenggat, kepentingan (1–5), estimasi durasi.
- Filter berdasarkan kategori dan status, urut berdasarkan tenggat.

**Selesai jika:** pengguna dapat mendaftar, mencatat tugas, dan data tidak terlihat oleh pengguna lain.

### Fase 2: Priority Engine (deterministik)

Tujuan: daftar tugas terurut otomatis oleh skor, tanpa AI.

- Tulis `shared/priority.ts`: normalisasi lima faktor, bobot dari konfigurasi, skor 0–100.
- Tambahkan kolom `late_consequence`, `priority_score`, dan `priority_reason`.
- Tampilkan `PriorityBadge` dan urutkan daftar berdasarkan skor.
- Buat alasan prioritas berbasis *template* (contoh: `"Deadline besok, durasi 3 jam"`).
- Tulis *unit test* untuk kasus A vs B pada contoh di atas.

**Selesai jika:** tugas A (deadline besok, 3 jam) selalu berada di atas tugas B (5 hari lagi, 1 jam).

### Fase 3: Profil Tidur, Slot Planner, dan Sleep-Guard

Tujuan: sistem menyarankan *kapan* tugas dikerjakan tanpa mengorbankan tidur.

- Halaman Settings: jam tidur, jam aktif harian, dan jadwal kuliah tetap (`fixed_schedules`).
- `shared/sleepGuard.ts`: zona istirahat yang tidak boleh diisi.
- `shared/slotPlanner.ts`: cari slot kosong, tempatkan tugas berurutan sesuai skor, sisipkan jeda.
- `DayTimeline` dan `WorkloadBar`: tampilan jadwal harian dan beban kerja, termasuk peringatan kelebihan kapasitas.
- Simpan hasil ke `scheduled_blocks`.

**Selesai jika:** tidak ada blok tugas yang menyentuh zona tidur atau bentrok dengan kuliah, dan peringatan muncul saat tugas melebihi kapasitas.

### Fase 4: Integrasi Gemini API (Edge Function pertama)

Tujuan: menambah tugas lewat bahasa natural, dengan API key aman di server.

1. Buat API key di [Google AI Studio](https://aistudio.google.com).
2. Simpan sebagai secret, jangan di frontend:
   ```bash
   supabase secrets set GEMINI_API_KEY=AIzaSy...
   ```
3. Buat fungsi `parse-task` dengan *Structured Output* (`responseMimeType: "application/json"` + `responseSchema`).
4. Validasi keluaran Gemini dengan Zod sebelum dikirim ke klien. Jika tidak valid, kembalikan error 422.
5. Tambahkan tabel `ai_usage` dan cek kuota harian di awal fungsi (maks. mis. 30 panggilan/pengguna/hari).
6. Di React, tambahkan `NaturalInput`: hasil parsing ditampilkan sebagai **pratinjau** di `TaskForm` dan baru disimpan setelah pengguna menekan Simpan.

```ts
// supabase/functions/parse-task/index.ts
import { z } from "npm:zod@3";

const TaskSchema = z.object({
  title: z.string(),
  category: z.enum(["kuliah", "praktikum", "organisasi", "pribadi"]),
  deadline: z.string().datetime(),
  importance: z.number().int().min(1).max(5),
  estimated_minutes: z.number().int().positive(),
});

Deno.serve(async (req) => {
  // JWT diverifikasi otomatis oleh Supabase (verify_jwt aktif secara default).
  const { text } = await req.json();

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get("GEMINI_API_KEY")!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Ekstrak tugas dari: "${text}". Zona waktu Asia/Jakarta.` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { /* skema JSON setara TaskSchema */ },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const data = await res.json();
  const raw = JSON.parse(data.candidates[0].content.parts[0].text);
  const parsed = TaskSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Output AI tidak valid" }), { status: 422 });
  }
  return new Response(JSON.stringify(parsed.data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Pemanggilan dari React:

```ts
const { data, error } = await supabase.functions.invoke("parse-task", {
  body: { text: "laporan kimia dasar Jumat jam 5" },
});
```

**Selesai jika:** kalimat natural menjadi pratinjau tugas yang benar, dan aplikasi tetap berjalan normal saat Gemini gagal atau kuota habis (form manual tetap tersedia).

### Fase 5: Saran dan Penjelasan AI

- Fungsi `explain-priority`: Gemini menulis penjelasan natural berdasarkan rincian skor. Angka skor tetap dihitung oleh `shared/priority.ts`, AI hanya menjelaskan.
- Saran AI untuk `importance` dan `estimated_minutes` saat pengguna mengosongkan isian, selalu dapat diubah pengguna.
- *Fallback* ke alasan berbasis template dari Fase 2 bila AI tidak tersedia.

**Selesai jika:** setiap tugas punya alasan prioritas yang konsisten dengan skornya.

### Fase 6: Smart Rescheduling dan Diff View

Tujuan: fitur inti penelitian.

- Fungsi `suggest-reschedule`: kirim konteks (tugas terdampak, jadwal tetap, zona tidur) ke Gemini, terima usulan JSON terstruktur.
- Jalankan **validator** (`shared/validator.ts`) di Edge Function: tolak usulan yang melanggar jam tidur, bentrok kuliah, atau melewati tenggat tanpa peringatan. Ulangi permintaan hingga 2 kali bila ditolak.
- Jika tetap gagal, gunakan hasil `slotPlanner` deterministik dari Fase 3 sebagai cadangan.
- `ReschedulePanel` dan `DiffView`: bandingkan jadwal lama dan baru.
- Penyimpanan jadwal baru lewat **fungsi Postgres (RPC)** yang memeriksa ulang aturan dasar, lalu mencatat ke `reschedule_history`.

**Selesai jika:** usulan yang melanggar aturan tidak pernah sampai ke Diff View, dan jadwal hanya berubah setelah pengguna menyetujui.

### Fase 7: Pengingat, Snooze, dan Estimasi Durasi Personal

- Pengingat tugas dan tombol *snooze*. `snooze_count` ikut menambah skor urgensi.
- Saat tugas selesai, catat durasi aktual ke `task_logs`.
- `shared/durationEstimator.ts`: koreksi estimasi memakai rata-rata rasio `actual/estimated` per kategori per pengguna (*exponential moving average*). Regresi sederhana dapat dihitung di Postgres dengan `regr_slope` dan `regr_intercept`.

**Selesai jika:** estimasi durasi untuk pengguna dengan riwayat cukup bergeser mendekati durasi aktualnya.

### Fase 8: Validasi, Uji Coba, dan Kalibrasi

- Validasi ahli materi dan ahli media.
- Uji coba terbatas pada mahasiswa FMIPA UNJ (usability dan ketepatan rekomendasi).
- Kalibrasi bobot prioritas berdasarkan hasil uji.
- Dokumentasi, panduan pengguna, dan artikel ilmiah.

---

## Instalasi & Menjalankan Lokal

### Prasyarat

- Node.js v18 atau lebih baru
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (diperlukan untuk menjalankan Supabase lokal, opsional bila langsung memakai Supabase Cloud)
- Akun [Supabase](https://supabase.com) (proyek baru)
- API Key [Google AI Studio](https://aistudio.google.com) (mulai Fase 4)

### 1. Kloning Repositori

```bash
git clone https://github.com/username/snoozeplan-ai.git
cd snoozeplan-ai
```

### 2. Setup Database

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push          # menjalankan seluruh migrasi di supabase/migrations/
```

Alternatif tanpa CLI: buka dashboard Supabase → **SQL Editor**, lalu jalankan skrip di `supabase/migrations/` secara berurutan.

### 3. Menjalankan Frontend

```bash
cd frontend
npm install
cp .env.example .env      # isi sesuai bagian Variabel Lingkungan
npm run dev               # http://localhost:5173
```

Pada Fase 1–3 langkah ini sudah cukup. Aplikasi belum membutuhkan Edge Function.

### 4. Menjalankan Edge Function (mulai Fase 4)

```bash
# Simpan secret di proyek Supabase Cloud
supabase secrets set GEMINI_API_KEY=AIzaSy...

# Deploy fungsi
supabase functions deploy parse-task
supabase functions deploy explain-priority
supabase functions deploy suggest-reschedule
```

Untuk pengembangan lokal, buat `supabase/functions/.env` berisi `GEMINI_API_KEY=...` (jangan di-commit), lalu:

```bash
supabase start
supabase functions serve --env-file supabase/functions/.env
```

---

## Variabel Lingkungan & Secrets

**`frontend/.env`**

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

**Supabase Secrets** (diatur lewat `supabase secrets set`, bukan file di frontend)

```env
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"
AI_DAILY_LIMIT="30"
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia di Edge Function sehingga tidak perlu diatur manual.

> **Penting:** jangan commit file `.env`. Pastikan sudah ada di `.gitignore`. `GEMINI_API_KEY` dan service role key hanya boleh berada di sisi server (Supabase), tidak pernah di frontend atau diawali `VITE_`.

---

## Keamanan & Batasan

| Hal | Penanganan |
|-----|------------|
| **Kerahasiaan API key** | Gemini key hanya di Supabase Secrets, dipakai di Edge Function. |
| **Akses data** | RLS aktif di semua tabel. Frontend hanya memakai anon key. |
| **Autentikasi fungsi** | `verify_jwt` aktif (default), hanya pengguna login yang dapat memanggil fungsi. |
| **Penyalahgunaan kuota AI** | Tabel `ai_usage` membatasi panggilan per pengguna per hari. |
| **Keluaran AI tidak tepercaya** | Selalu divalidasi Zod dan `validator.ts`. AI hanya mengusulkan. |
| **Klien dimodifikasi** | Penyimpanan jadwal lewat RPC Postgres dengan pemeriksaan aturan dasar. |
| **Waktu eksekusi** | Edge Function memiliki batas waktu (sekitar 150 detik pada tier Free). Beri *timeout* pada panggilan Gemini dan tangani error. |
| **Runtime** | Deno, bukan Node. Gunakan impor `npm:` atau `jsr:`. |
| **Gemini tidak tersedia** | Aplikasi tetap berfungsi lewat jalur deterministik (Fase 1–3). |

---

## Deployment

| Layanan | Langkah Singkat |
|---------|-----------------|
| **Supabase** | Buat proyek (tier Free), jalankan migrasi (`supabase db push`), ambil URL dan Anon Key dari **Settings → API**, set secrets, lalu `supabase functions deploy` untuk setiap fungsi. |
| **Frontend (Vercel)** | Hubungkan repo, *Root Directory* `frontend`, preset **Vite**, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. |
| **Auth** | Di Supabase → **Authentication → URL Configuration**, tambahkan domain Vercel ke *Site URL* dan *Redirect URLs*. |

---

## Roadmap

Selaras dengan model pengembangan **4D** (Define, Design, Develop, Disseminate):

- [x] **Define**: analisis kebutuhan melalui kuesioner Guttman (20 responden FMIPA UNJ)
- [x] **Design**: rancangan UI/UX, landing page
- [ ] **Develop (MVP tanpa AI)**
  - [ ] Fase 0: persiapan proyek
  - [ ] Fase 1: auth, CRUD tugas, RLS
  - [ ] Fase 2: Priority Engine (5 faktor) dan daftar tugas terurut
  - [ ] Fase 3: profil tidur, Slot Planner, Sleep-Guard, ringkasan beban harian
- [ ] **Develop (integrasi Gemini)**
  - [ ] Fase 4: Edge Function `parse-task`, kuota `ai_usage`, input bahasa natural
  - [ ] Fase 5: penjelasan dan saran prioritas via Gemini
  - [ ] Fase 6: Smart Rescheduling + Validator + Diff View
  - [ ] Fase 7: pengingat, snooze, estimator durasi personal
- [ ] **Develop (validasi)**
  - [ ] Validasi ahli materi dan ahli media
  - [ ] Uji coba terbatas pada mahasiswa FMIPA UNJ
  - [ ] Kalibrasi bobot prioritas
- [ ] **Disseminate**: distribusi prototipe, panduan pengguna, dan artikel ilmiah
- [ ] **Opsional (jangka panjang):** layanan ML terpisah bila data riwayat sudah cukup besar

---