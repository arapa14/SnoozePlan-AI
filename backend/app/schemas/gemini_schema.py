from pydantic import BaseModel, Field
from typing import List

class ScheduleBlock(BaseModel):
    title: str = Field(description="Nama aktivitas, tugas, atau nama blok istirahat")
    category: str = Field(description="AKADEMIK, ORGANISASI, PRIBADI, ISTIRAHAT, atau TIDUR")
    start_time: str = Field(description="Format ISO 8601 string, contoh: 2026-10-14T08:00:00")
    end_time: str = Field(description="Format ISO 8601 string, contoh: 2026-10-14T10:00:00")
    task_id: str | None = Field(default=None, description="UUID task jika blok ini mengerjakan tugas tertentu")
    is_sleep_guard: bool = Field(default=False, description="True jika slot ini mengamankan waktu tidur/istirahat mahasiswa")

class ReschedulePlanResponse(BaseModel):
    analysis_summary: str = Field(description="Penjelasan singkat penataan jadwal dan strategi mitigasi bentrok")
    total_sleep_hours: float = Field(description="Total durasi jam tidur/istirahat yang berhasil diamankan")
    optimized_schedule: List[ScheduleBlock] = Field(description="Daftar blok aktivitas harian yang sudah terurut dan bebas bentrok")