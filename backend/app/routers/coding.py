from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, CodingAttempt
from app.schemas import CodingGenerateRequest, CodingRunRequest
from app.deps import get_current_user
from app.services.ai_service import generate_coding_problem
from app.services.code_runner import run_code

router = APIRouter(prefix="/api/coding", tags=["coding"])


@router.post("/generate")
async def generate_problem(
    payload: CodingGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await generate_coding_problem(payload.topic, payload.difficulty)

    attempt = CodingAttempt(
        user_id=current_user.id,
        problem_title=problem["title"],
        problem_statement=problem["statement"],
        language="python",
        source_code=problem.get("starter_code", {}).get("python", ""),
        test_cases_json=problem["test_cases"],
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "title": problem["title"],
        "statement": problem["statement"],
        "starter_code": problem.get("starter_code", {}),
    }


@router.post("/run")
async def run_submission(
    payload: CodingRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CodingAttempt).where(CodingAttempt.id == payload.attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Coding attempt not found")

    outcome = await run_code(payload.language, payload.source_code, attempt.test_cases_json)

    attempt.language = payload.language
    attempt.source_code = payload.source_code
    attempt.results_json = outcome["results"]
    attempt.passed = outcome["passed"]
    attempt.total = outcome["total"]
    await db.commit()

    return outcome
