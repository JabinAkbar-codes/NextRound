from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, InterviewSession
from app.schemas import InterviewStartRequest, InterviewReplyRequest
from app.deps import get_current_user
from app.services.ai_service import interview_turn, final_interview_report

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.post("/start")
async def start_interview(
    payload: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = InterviewSession(user_id=current_user.id, role=payload.role, mode=payload.mode)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    turn = await interview_turn(payload.role, payload.mode, [])
    session.transcript_json = [{"role": "assistant", "content": turn["message"]}]
    await db.commit()

    return {"session_id": session.id, "message": turn["message"]}


@router.post("/reply")
async def reply_interview(
    payload: InterviewReplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == payload.session_id))
    session = result.scalar_one_or_none()
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview has already ended")

    transcript = list(session.transcript_json)
    transcript.append({"role": "user", "content": payload.message})

    turn = await interview_turn(session.role, session.mode, transcript)
    transcript.append({"role": "assistant", "content": turn["message"]})
    session.transcript_json = transcript

    response = {
        "message": turn["message"],
        "feedback_on_last_answer": turn.get("feedback_on_last_answer", ""),
        "flags": turn.get("flags", []),
        "ended": False,
    }

    if turn.get("should_end"):
        report = await final_interview_report(session.role, transcript)
        session.feedback_json = report
        session.overall_score = report.get("overall_score")
        session.status = "completed"
        response["ended"] = True
        response["report"] = report

    await db.commit()
    return response
