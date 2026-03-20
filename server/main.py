import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes import auth, therapists, reports, notes, defects, patients as old_patients
from routers import baseline, tasks as new_tasks, patients as v3_patients, plans, sessions, progress
from contextlib import asynccontextmanager
from services.asr_service import asr_service
from services.ser_service import ser_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Pre-loading AI Models into memory...")
    asr_service.load_model()
    ser_service.load_model()
    yield
    print("Shutting down...")

# Initialize FastAPI app
app = FastAPI(title="Speech Therapy API", version="2.0.0", lifespan=lifespan)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(therapists.router)
app.include_router(old_patients.router)
app.include_router(v3_patients.router, prefix="/api/v1")
app.include_router(plans.router)
app.include_router(sessions.router)
app.include_router(progress.router)
app.include_router(new_tasks.router)
app.include_router(baseline.router)
app.include_router(reports.router)
app.include_router(notes.router)
app.include_router(defects.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
