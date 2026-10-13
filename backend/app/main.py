# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints.rescheduler import router as reschedule_router
from app.core.config import settings

app = FastAPI(title="SnoozePlan AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "SnoozePlan AI API is running!"}

app.include_router(reschedule_router, prefix="/api/v1/reschedule", tags=["Rescheduler"])