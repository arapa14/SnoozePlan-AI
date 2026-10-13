from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.gemini_schema import ReschedulePlanResponse
from typing import List, Dict, Any

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_optimized_schedule(
    profile_data: Dict[str, Any],
    fixed_schedules: List[Dict[str, Any]],
    pending_tasks: List[Dict[str, Any]]
) -> ReschedulePlanResponse:
    target_sleep = profile_data.get("target_sleep_hours", 7.0)
    sleep_start = profile_data.get("preferred_sleep_start", "23:00:00")

    prompt = f"""
    Kamu adalah SnoozePlan AI, sistem optimasi penjadwalan cerdas untuk mahasiswa FMIPA UNJ.
    
    ATURAN UTAMA (SLEEP-GUARD):
    1. Mahasiswa WAJIB mendapatkan tidur minimal {target_sleep} jam, idealnya dimulai sekitar pukul {sleep_start}.
    2. DILARANG KERAS menempatkan tugas atau kegiatan pada slot tidur (kunci dengan is_sleep_guard = True).
    3. Hindari tabrakan dengan jadwal kuliah/kegiatan tetap yang terkunci (is_locked = True).
    4. Urutkan tugas berdasarkan deadline terdekat, tingkat kesulitan, dan estimasi durasi.
    5. Berikan jeda istirahat singkat (15-30 menit) di antara sesi tugas yang berat.

    DATA JADWAL TETAP (KULIAH / KEGIATAN KUNCI):
    {fixed_schedules}

    DAFTAR TUGAS YANG HARUS DIKERJAKAN:
    {pending_tasks}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReschedulePlanResponse,
            temperature=0.2,
        ),
    )

    return ReschedulePlanResponse.model_validate_json(response.text)