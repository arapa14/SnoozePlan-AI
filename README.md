# SnoozePlan AI: Sistem Penjadwalan Cerdas Mahasiswa FMIPA UNJ

**SnoozePlan AI** adalah aplikasi manajemen waktu dan penjadwalan cerdas berbasis *Large Language Model* (Google Gemini API) yang dirancang untuk mengatasi penumpukan tugas, konflik jadwal, dan kurangnya waktu istirahat pada mahasiswa FMIPA Universitas Negeri Jakarta.

Sistem ini secara otomatis menyusun ulang (*dynamic rescheduling*) agenda akademik, kegiatan organisasi, dan urusan pribadi **tanpa mengorbankan kuota jam tidur minimal** mahasiswa.

---

## Daftar Isi

1. [Latar Belakang & Masalah](#latar-belakang--masalah)
2. [Fitur Utama](#fitur-utama)
3. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
4. [Struktur Direktori](#struktur-direktori)
5. [Prasyarat Sistem](#prasyarat-sistem)
6. [Panduan Instalasi & Menjalankan Lokal](#panduan-instalasi--menjalankan-lokal)
7. [Variabel Lingkungan (.env)](#variabel-lingkungan-env)
8. [Panduan Deployment Gratis](#panduan-deployment-gratis)
9. [Alur Kerja Sistem (Workflow)](#alur-kerja-sistem-workflow)

---

## Latar Belakang & Masalah

Berdasarkan analisis kebutuhan mahasiswa FMIPA UNJ:

- **Tingginya beban akademik**: penumpukan laporan praktikum, kuis, dan tugas besar dalam rentang waktu yang berdekatan.
- **Jadwal dinamis**: perubahan mendadak pada jam kuliah pengganti atau agenda organisasi memicu efek domino (*schedule cascading conflict*).
- **Kelelahan fisik & mental**: kesulitan menentukan prioritas menyebabkan mahasiswa menunda tugas dan mengorbankan waktu tidur harian.

SnoozePlan AI hadir sebagai jembatan mitigasi beban melalui fitur **Smart Rescheduling** dan **Sleep-Guard Block**.

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Conflict Detection Engine** | Mendeteksi tabrakan waktu antara jadwal kuliah tetap, agenda ormawa (BEM/BEMP), dan kegiatan pribadi. |
| **Cognitive Effort Estimator** | Memetakan estimasi durasi tugas berdasarkan kategori: modul, laporan praktikum, atau tugas reguler. |
| **One-Click Dynamic Rescheduler** | Rekonstruksi jadwal otomatis via Google Gemini API dengan *Structured JSON Output* ketika terjadi perubahan agenda mendadak. |
| **Sleep & Rest Guard** | Slot jam tidur (default 6–8 jam) dikunci secara permanen; AI tidak diizinkan menyisipkan tugas ke dalam zona istirahat ini. |
| **Comparison Diff View** | Visualisasi sebelum (*before*) dan sesudah (*after*) restrukturisasi jadwal sebelum disetujui pengguna. |

---

## Arsitektur & Tech Stack

| Lapisan | Teknologi | Hosting |
|---------|-----------|---------|
| **Client Side (Frontend)** | React (Vite), Tailwind CSS, Lucide React | Vercel |
| **API & Core Logic (Backend)** | FastAPI (Python 3.11+), Pydantic v2 | Koyeb / Railway |
| **Database & Identity** | Supabase (PostgreSQL, Row Level Security, Supabase Auth) | Supabase Cloud |
| **AI Engine** | Google GenAI SDK (`gemini-2.5-flash` / `gemini-1.5-flash`) dengan skema *Structured Output* | Google AI Studio |

---

## Struktur Direktori

```text
snoozeplan-ai/
├── frontend/                     # Antarmuka React SPA (Vercel)
│   ├── src/
│   │   ├── components/           # Komponen modular (Timeline, TaskCard, DiffView)
│   │   ├── contexts/             # Supabase Auth Provider
│   │   ├── hooks/                # Custom React Hooks
│   │   ├── lib/                  # Klien Supabase & Axios
│   │   └── pages/                # Dashboard, Tasks, Calendar, Reschedule, Settings
│   ├── vercel.json               # Konfigurasi SPA rewrite
│   └── package.json
├── backend/                      # Backend FastAPI (Koyeb / Railway)
│   ├── app/
│   │   ├── api/v1/endpoints/     # Endpoint tasks, schedules, rescheduler
│   │   ├── core/                 # Config & Supabase token verification
│   │   ├── schemas/              # Skema Pydantic (Request, Response, Gemini JSON)
│   │   ├── services/             # Gemini API integration & conflict detector
│   │   └── main.py               # Inisialisasi API & CORS
│   ├── Dockerfile
│   └── requirements.txt
├── database/                     # Migrasi SQL PostgreSQL
│   └── migrations/               # DDL tabel profiles, tasks, schedules
└── README.md
```

---

## Prasyarat Sistem

- **Node.js**: v18.x atau lebih baru
- **Python**: v3.10 atau v3.11
- **Akun layanan eksternal**:
  - Akun [Supabase](https://supabase.com) (proyek baru)
  - API Key [Google AI Studio](https://aistudio.google.com) (Gemini API)

---

## Panduan Instalasi & Menjalankan Lokal

### 1. Kloning Repositori

```bash
git clone https://github.com/username/snoozeplan-ai.git
cd snoozeplan-ai
```

### 2. Setup Database (Supabase)

1. Buka dashboard proyek Supabase Anda → **SQL Editor**.
2. Jalankan skrip DDL di direktori `database/migrations/` **secara berurutan** untuk membuat tabel `profiles`, `tasks`, dan `schedules`.

### 3. Setup & Menjalankan Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Mengaktifkan venv:
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Isi variabel di dalam .env sesuai konfigurasi Anda

uvicorn app.main:app --reload --port 8000
```

> Dokumentasi Swagger API lokal tersedia di <http://localhost:8000/docs>.

### 4. Setup & Menjalankan Frontend (React)

Buka terminal baru:

```bash
cd frontend
npm install
cp .env.example .env
# Sesuaikan VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, dan VITE_API_URL

npm run dev
```

> Aplikasi lokal berjalan di <http://localhost:5173>.

---

## Variabel Lingkungan (.env)

### Backend (`backend/.env`)

```env
PROJECT_NAME="SnoozePlan AI"
GEMINI_API_KEY="AIzaSy..."
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
CORS_ORIGINS="http://localhost:5173,https://snoozeplan.vercel.app"
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
VITE_API_URL="http://localhost:8000/api/v1"
```

> **Penting:** jangan pernah meng-commit file `.env` ke repositori. Pastikan `.env` sudah masuk ke `.gitignore`.

---

## Panduan Deployment Gratis

### 1. Database (Supabase Cloud)

1. Buat *organization* dan *project* baru di tier **Free**.
2. Ambil URL proyek, Anon Key, dan JWT Secret melalui menu **Settings → API**.

### 2. Backend (Koyeb / Railway)

**Koyeb (rekomendasi free tier):**

1. Hubungkan repositori GitHub Anda ke Koyeb.
2. Atur *work directory* ke `/backend`.
3. Pilih builder: **Dockerfile** atau **Buildpack** dengan perintah:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
4. Masukkan seluruh *environment variables* backend.
5. Deploy layanan.

### 3. Frontend (Vercel)

1. Hubungkan repositori GitHub ke Vercel.
2. Atur **Root Directory** ke `frontend`.
3. Pilih **Framework Preset**: Vite.
4. Tambahkan *environment variables* frontend (arahkan `VITE_API_URL` ke domain backend Koyeb yang sudah aktif).
5. Deploy.

---

## Alur Kerja Sistem (Workflow)

```text
[Mahasiswa Input Tugas / Perubahan Jadwal]
                   │
                   ▼
       [Frontend: React (Vercel)]
                   │ (HTTP POST + JWT Auth)
                   ▼
       [Backend: FastAPI (Koyeb)]
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
[Validasi Pydantic]      [Fetch Data Profil & Tidur (Supabase)]
    │                             │
    └──────────────┬──────────────┘
                   │
                   ▼
     [Gemini AI Optimization Engine]
     - Kunci blok waktu tidur (Sleep-Guard)
     - Atur urutan prioritas & durasi tugas
     - Structured JSON schema enforcement
                   │
                   ▼
[Preview Reschedule Diff View di Dashboard]
                   │
            (Disetujui User)
                   │
                   ▼
[Simpan Jadwal Baru ke Supabase Database]
```