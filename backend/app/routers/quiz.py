from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, QuizAttempt
from app.schemas import QuizGenerateRequest, QuizSubmitRequest
from app.deps import get_current_user
from app.services.ai_service import generate_mcqs, MAX_QUESTIONS_PER_REQUEST
from app.services import cache

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


@router.post("/generate")
async def generate_quiz(
    payload: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.num_questions < 1 or payload.num_questions > MAX_QUESTIONS_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"num_questions must be between 1 and {MAX_QUESTIONS_PER_REQUEST}")
    if not payload.topic.strip():
        raise HTTPException(status_code=400, detail="Please enter a topic")

    cache_key = cache.make_key("mcq", payload.topic, payload.difficulty, str(payload.num_questions))
    questions = await cache.cache_get(cache_key)
    if not questions:
        questions = await generate_mcqs(payload.topic, payload.difficulty, payload.num_questions)
        await cache.cache_set(cache_key, questions, ttl_seconds=1800)

    attempt = QuizAttempt(
        user_id=current_user.id,
        topic=payload.topic,
        difficulty=payload.difficulty,
        questions_json=questions,
        total=len(questions),
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Strip correct answers before sending to the client
    client_questions = [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]
    return {"attempt_id": attempt.id, "questions": client_questions}


@router.post("/submit")
async def submit_quiz(
    payload: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(QuizAttempt).where(QuizAttempt.id == payload.attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    correct = 0
    breakdown = []
    for q in attempt.questions_json:
        selected = payload.answers.get(q["id"])
        is_correct = selected == q["correct_option_id"]
        if is_correct:
            correct += 1
        breakdown.append({
            "id": q["id"],
            "correct_option_id": q["correct_option_id"],
            "selected": selected,
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
        })

    attempt.answers_json = payload.answers
    attempt.score = round(100 * correct / max(len(attempt.questions_json), 1), 1)
    attempt.time_taken_seconds = payload.time_taken_seconds
    await db.commit()

    return {
        "score": attempt.score,
        "correct": correct,
        "total": len(attempt.questions_json),
        "breakdown": breakdown,
    }
