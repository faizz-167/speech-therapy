from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from database import get_db
from models.models import TherapyNote, Therapist
from middleware.auth import require_role

router = APIRouter(prefix="/notes", tags=["Therapy Notes"])

class NoteCreateRequest(BaseModel):
    patient_id: str
    note_text: str

@router.post("/", status_code=201)
async def create_note(
    data: NoteCreateRequest,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    t_stmt = select(Therapist).where(Therapist.user_id == current_user["id"])
    t_result = await db.execute(t_stmt)
    therapist = t_result.scalars().first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")
    
    note = TherapyNote(
        therapist_id=therapist.id,
        patient_id=data.patient_id,
        note_text=data.note_text
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"id": note.id, "message": "Note created"}

@router.get("/{patient_id}")
async def get_notes(
    patient_id: str,
    current_user: dict = Depends(require_role(["therapist"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TherapyNote).where(TherapyNote.patient_id == patient_id).order_by(TherapyNote.created_at.desc())
    result = await db.execute(stmt)
    notes = result.scalars().all()
    return [
        {
            "id": n.id,
            "note_text": n.note_text,
            "created_at": str(n.created_at)
        }
        for n in notes
    ]
