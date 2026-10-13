from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.gemini_service import generate_optimized_schedule
from app.schemas.gemini_schema import ReschedulePlanResponse

router = APIRouter()

class RescheduleRequest(BaseModel):
    profile: Dict[str, Any]
    fixed_schedules: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]

@router.post("/optimize", response_model=ReschedulePlanResponse)
def trigger_reschedule(payload: RescheduleRequest):
    try:
        result = generate_optimized_schedule(
            profile_data=payload.profile,
            fixed_schedules=payload.fixed_schedules,
            pending_tasks=payload.tasks
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))