# SnoozePlan AI

**To-Do List cerdas untuk mahasiswa FMIPA UNJ: tugas diurutkan otomatis oleh AI berdasarkan prioritas, dan jadwal disusun ulang tanpa mengorbankan waktu tidur.**

SnoozePlan AI adalah aplikasi web *to-do list* yang dilengkapi mesin prioritas adaptif dan penjadwalan ulang (*rescheduling*) berbasis kecerdasan buatan. Pengguna cukup mencatat tugas. Sistem menghitung skor prioritas, menaruh tugas ke slot waktu yang tersedia, lalu menyusun ulang ketika ada perubahan mendadak.

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
9. [Instalasi & Menjalankan Lokal](#instalasi--menjalankan-lokal)
10. [Variabel Lingkungan](#variabel-lingkungan)
11. [Deployment](#deployment)
12. [Roadmap](#roadmap)
13. [Tim & Lisensi](#tim--lisensi)

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

| Fitur | Deskripsi |
|-------|-----------|
| **Smart To-Do List** | Tambah, ubah, selesaikan, dan kelompokkan tugas (kuliah, praktikum, organisasi, pribadi). Dilengkapi tenggat, tingkat kepentingan, dan estimasi durasi. |
| **Adaptive Priority Scoring** | Setiap tugas mendapat skor 0–100 dari lima faktor: urgensi, kepentingan, estimasi durasi, konsekuensi keterlambatan, dan ketersediaan waktu. Daftar tugas selalu terurut berdasarkan skor ini. |
| **Work & Rest Optimizer** | Menjaga keseimbangan kerja dan istirahat. Jam tidur minimal dikunci dan tugas tidak pernah ditempatkan di zona istirahat. Sistem juga menyisipkan jeda antar sesi kerja. |
| **Dynamic Smart Rescheduling** | Saat jadwal berubah atau terjadi bentrok, sistem menyusun ulang tugas yang terdampak dengan satu klik. |
| **Diff View (Sebelum/Sesudah)** | Pengguna melihat perbandingan jadwal lama dan baru, lalu menyetujui atau menolak sebelum disimpan. |
| **Pengingat & Snooze** | Pengingat tugas dengan opsi *snooze*. Hasil snooze ikut menjadi sinyal untuk skor prioritas. |
| **Estimasi Durasi Personal** | AI belajar dari selisih estimasi dan durasi aktual pengerjaan, sehingga estimasi makin sesuai kebiasaan pengguna. |
| **Penjelasan Prioritas** | Setiap tugas punya alasan singkat, misalnya *"Prioritas tinggi: deadline besok dan durasi 3 jam."* Pengguna tahu mengapa tugas ditempatkan di urutan tersebut. |
| **Ringkasan Beban Harian** | Dashboard beban kerja per hari, termasuk peringatan jika total tugas melebihi kapasitas waktu. |

---

## Cara Kerja Prioritas (Adaptive Priority Scoring)

Skor prioritas dihitung dari lima faktor yang dirumuskan pada penelitian:

| # | Faktor | Arti | Sumber Data |
|---|--------|------|-------------|
| 1 | **Urgensi** | Seberapa dekat tenggat waktu | Dihitung dari `deadline` |
| 2 | **Kepentingan** | Pengaruh tugas terhadap tujuan akademik/pribadi | Input pengguna (1–5), dibantu saran AI |
| 3 | **Estimasi durasi** | Waktu yang dibutuhkan untuk menyelesaikan tugas | Input pengguna atau estimasi AI |
| 4 | **Konsekuensi keterlambatan** | Dampak jika tugas telat (nilai, sanksi, dll.) | Kategori tugas dan input pengguna |
| 5 | **Ketersediaan waktu** | Kecocokan tugas dengan waktu luang dan jadwal tetap | Dihitung dari jadwal kuliah dan slot kosong |

```text
Skor = w1·Urgensi + w2·Kepentingan + w3·Konsekuensi + w4·KesesuaianDurasi + w5·Ketersediaan
```

Setiap faktor dinormalisasi ke skala 0–1 lalu dikalikan bobot `w`. Total skor diskalakan ke 0–100.

**Bobot awal (default, perlu dikalibrasi):**

| Bobot | Nilai Awal |
|-------|-----------|
| `w1` Urgensi | 0.30 |
| `w2` Kepentingan | 0.25 |
| `w3` Konsekuensi | 0.20 |
| `w4` Durasi | 0.10 |
| `w5` Ketersediaan | 0.15 |

> **Catatan metodologis:** nilai bobot di atas hanya titik awal. Sesuai kajian pada naskah penelitian, bobot dan rumus harus ditentukan serta diuji lebih dulu agar rekomendasi dapat dipertanggungjawabkan. Pengujian dilakukan lewat validasi ahli dan uji coba terbatas. Bobot disimpan di konfigurasi dan dapat dipersonalisasi per pengguna.

**Contoh:** tugas A dikumpulkan besok dan butuh 3 jam, sedangkan tugas B dikumpulkan 5 hari lagi dan butuh 1 jam. Jika hanya durasi yang dilihat, B akan dikerjakan lebih dulu (seperti aturan SPT). Karena urgensi dan konsekuensi ikut dihitung, **A tetap mendapat prioritas lebih tinggi**.

---

## Peran AI dalam Sistem

Sistem menggunakan **pendekatan hibrida**. Logika deterministik (aturan dan optimasi) menjadi mekanisme utama, sedangkan AI/*machine learning* menjadi komponen yang mempelajari pola pengguna.

| Komponen | Teknik | Tugas |
|----------|--------|-------|
| **Priority & Constraint Engine** | Rule-based + skor berbobot (EDD sebagai acuan urgensi) | Menghitung skor dan menegakkan batasan yang tidak boleh dilanggar: jadwal kuliah, jam tidur, dan tenggat tetap. |
| **Duration Estimator** | ML ringan atas riwayat durasi aktual (*supervised learning*) | Memperbaiki estimasi durasi per kategori dan per pengguna. |
| **Gemini API (LLM)** | Google Gemini dengan *Structured JSON Output* | Memahami input bahasa natural (*"laporan kimia dasar Jumat jam 5"*), menyarankan kepentingan dan estimasi, menyusun usulan rescheduling, serta menulis penjelasan prioritas. |
| **Validator** | Kode deterministik + Pydantic | Memeriksa setiap keluaran AI. Jika usulan melanggar jam tidur, bentrok dengan kuliah, atau melewati tenggat tanpa peringatan, usulan ditolak dan diulang. |

**Prinsip keamanan:** AI hanya *mengusulkan*, tidak pernah menyimpan jadwal langsung. Jadwal baru baru disimpan setelah lolos validator dan disetujui pengguna lewat Diff View.

---

## Alur Pengguna

```text
1. Daftar / Masuk
2. Atur profil: jam tidur (default 6–8 jam), jam kuliah tetap, jam aktif harian
3. Tambah tugas (form cepat atau ketik bahasa natural)
4. Sistem menampilkan daftar tugas terurut + slot kerja yang disarankan
5. Kerjakan tugas → tandai selesai → catat durasi aktual (data belajar AI)
6. Jadwal berubah / tugas baru mendadak?
      → klik "Susun Ulang"
      → lihat Diff View (sebelum vs sesudah)
      → Setujui atau Tolak
```

---

## Arsitektur & Tech Stack

| Lapisan | Teknologi | Hosting |
|---------|-----------|---------|
| **Frontend** | React (Vite) + TypeScript, Tailwind CSS, Lucide React | Vercel |
| **Backend / API** | FastAPI (Python 3.11+), Pydantic v2 | Koyeb / Railway |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Supabase Auth) | Supabase Cloud |
| **AI Engine** | Google GenAI SDK (`gemini-2.5-flash`) dengan *Structured Output* (skema JSON) | Google AI Studio |
| **ML (estimasi durasi)** | scikit-learn / NumPy (modul opsional di backend) | Ikut backend |

> Python dipilih untuk backend karena ekosistem ML-nya (scikit-learn, pandas) memudahkan penambahan estimator durasi personal tanpa layanan terpisah.

### Diagram Alur Sistem

```text
[React + TypeScript (Vercel)]
          │  HTTPS + JWT (Supabase Auth)
          ▼
[FastAPI Backend (Koyeb / Railway)]
   ├── Task Service ───────────────► [Supabase PostgreSQL]
   ├── Priority Engine (skor 0–100)
   ├── Slot Planner (cari slot kosong, Sleep-Guard)
   ├── Gemini Service ─────────────► [Gemini API]
   │      • parsing input natural
   │      • saran estimasi & kepentingan
   │      • usulan rescheduling (JSON terstruktur)
   └── Validator (tolak usulan yang melanggar batasan)
          │
          ▼
[Diff View → persetujuan pengguna → simpan jadwal baru]
```

---

## Struktur Direktori

```text
snoozeplan-ai/
├── frontend/                        # React + TypeScript (Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── tasks/               # TaskList, TaskCard, TaskForm, PriorityBadge
│   │   │   ├── schedule/            # DayTimeline, SleepGuardBlock, WorkloadBar
│   │   │   └── reschedule/          # DiffView, ReschedulePanel
│   │   ├── contexts/                # AuthProvider (Supabase)
│   │   ├── hooks/                   # useTasks, useSchedule, useReschedule
│   │   ├── lib/                     # Klien Supabase & Axios
│   │   ├── pages/                   # Landing, Dashboard, Tasks, Schedule, Settings
│   │   └── types/                   # Tipe TypeScript bersama
│   ├── vercel.json                  # Konfigurasi SPA rewrite
│   └── package.json
├── backend/                         # FastAPI (Koyeb / Railway)
│   ├── app/
│   │   ├── api/v1/endpoints/        # tasks, schedules, reschedule, profile
│   │   ├── core/                    # Config, bobot prioritas, verifikasi JWT Supabase
│   │   ├── schemas/                 # Skema Pydantic (request, response, JSON Gemini)
│   │   ├── services/
│   │   │   ├── priority_engine.py   # Adaptive Priority Scoring
│   │   │   ├── slot_planner.py      # Penempatan tugas ke slot waktu
│   │   │   ├── sleep_guard.py       # Penegak zona istirahat
│   │   │   ├── duration_estimator.py# Estimasi durasi personal
│   │   │   ├── gemini_service.py    # Integrasi Gemini + structured output
│   │   │   └── validator.py         # Validasi hasil AI
│   │   └── main.py                  # Inisialisasi API & CORS
│   ├── Dockerfile
│   └── requirements.txt
├── database/
│   └── migrations/                  # SQL: profiles, tasks, fixed_schedules, dll.
└── README.md
```

---

## Model Data

| Tabel | Isi Utama |
|-------|-----------|
| `profiles` | `user_id`, jam tidur (`sleep_start`, `sleep_end`, `min_sleep_hours`), jam aktif harian, bobot prioritas personal |
| `tasks` | `title`, `category`, `deadline`, `importance` (1–5), `late_consequence` (1–5), `estimated_minutes`, `status`, `priority_score`, `priority_reason`, `snooze_count` |
| `fixed_schedules` | Jadwal tetap: kuliah, praktikum, agenda organisasi (`day_of_week`, `start_time`, `end_time`) |
| `scheduled_blocks` | Slot kerja hasil penjadwalan: `task_id`, `start_at`, `end_at`, `version` |
| `task_logs` | `estimated_minutes` vs `actual_minutes`, waktu selesai, jumlah snooze (data belajar AI) |
| `reschedule_history` | Jadwal sebelum dan sesudah, alasan, dan status persetujuan |

Semua tabel memakai **Row Level Security** sehingga pengguna hanya dapat mengakses datanya sendiri.

---

## Instalasi & Menjalankan Lokal

### Prasyarat

- Node.js v18 atau lebih baru
- Python 3.10 atau 3.11
- Akun [Supabase](https://supabase.com) (proyek baru)
- API Key [Google AI Studio](https://aistudio.google.com)

### 1. Kloning Repositori

```bash
git clone https://github.com/username/snoozeplan-ai.git
cd snoozeplan-ai
```

### 2. Setup Database

1. Buka dashboard Supabase → **SQL Editor**.
2. Jalankan seluruh skrip di `database/migrations/` secara berurutan.

### 3. Menjalankan Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Mengaktifkan venv:
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env     # isi variabel sesuai bagian di bawah

uvicorn app.main:app --reload --port 8000
```

> Dokumentasi Swagger API lokal: <http://localhost:8000/docs>.

### 4. Menjalankan Frontend (React)

Buka terminal baru:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev              # berjalan di http://localhost:5173
```

---

## Variabel Lingkungan

**`backend/.env`**

```env
PROJECT_NAME="SnoozePlan AI"
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
CORS_ORIGINS="http://localhost:5173,https://snooze-plan-ai.vercel.app"
```

**`frontend/.env`**

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
VITE_API_URL="http://localhost:8000/api/v1"
```

> **Penting:** jangan commit file `.env`. Pastikan sudah ada di `.gitignore`. `GEMINI_API_KEY` dan `SUPABASE_SERVICE_ROLE_KEY` hanya boleh berada di backend, tidak pernah di frontend.

---

## Deployment

| Layanan | Langkah Singkat |
|---------|-----------------|
| **Supabase** | Buat proyek (tier Free), jalankan migrasi, ambil URL, Anon Key, dan JWT Secret dari **Settings → API**. |
| **Backend (Koyeb / Railway)** | Hubungkan repo GitHub, set *work directory* ke `/backend`, build dengan **Dockerfile** atau Buildpack dengan perintah `uvicorn app.main:app --host 0.0.0.0 --port 8000`, lalu isi seluruh environment variable backend. |
| **Frontend (Vercel)** | Hubungkan repo, *Root Directory* `frontend`, preset **Vite**, isi `VITE_*` dengan `VITE_API_URL` mengarah ke domain backend. |

---

## Roadmap

Selaras dengan model pengembangan **4D** (Define, Design, Develop, Disseminate):

- [x] **Define**: analisis kebutuhan melalui kuesioner Guttman (20 responden FMIPA UNJ)
- [x] **Design**: rancangan UI/UX, landing page
- [ ] **Develop (MVP)**
  - [ ] Auth, CRUD tugas, profil tidur
  - [ ] Priority Engine (5 faktor) dan daftar tugas terurut
  - [ ] Slot Planner + Sleep-Guard
  - [ ] Input bahasa natural dan penjelasan prioritas via Gemini
  - [ ] Smart Rescheduling + Diff View
  - [ ] Pengingat dan Snooze
- [ ] **Develop (lanjutan)**
  - [ ] Estimator durasi personal dari riwayat
  - [ ] Validasi ahli materi dan ahli media
  - [ ] Uji coba terbatas pada mahasiswa FMIPA UNJ (usability dan ketepatan rekomendasi)
  - [ ] Kalibrasi bobot prioritas
- [ ] **Disseminate**: distribusi prototipe, panduan pengguna, dan artikel ilmiah

---