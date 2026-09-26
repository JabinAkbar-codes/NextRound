from collections import defaultdict
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import User, QuizAttempt, CodingAttempt, InterviewSession
from app.deps import require_full_account
from app.services.pdf_service import build_report_pdf

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _topic_breakdown(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(select(QuizAttempt).where(QuizAttempt.user_id == user_id))
    attempts = result.scalars().all()
    by_topic: dict[str, list[float]] = defaultdict(list)
    for a in attempts:
        if a.total > 0:
            by_topic[a.topic].append(a.score)
    return [
        {"topic": topic, "attempts": len(scores), "avg_score": round(sum(scores) / len(scores), 1)}
        for topic, scores in by_topic.items()
    ]


@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_full_account),
):
    topics = await _topic_breakdown(db, current_user.id)

    coding_result = await db.execute(select(CodingAttempt).where(CodingAttempt.user_id == current_user.id))
    coding_attempts = coding_result.scalars().all()

    interview_result = await db.execute(select(InterviewSession).where(InterviewSession.user_id == current_user.id))
    interviews = interview_result.scalars().all()

    overall_avg = round(sum(t["avg_score"] for t in topics) / len(topics), 1) if topics else 0
    weak_topics = [t["topic"] for t in topics if t["avg_score"] < 60]
    strong_topics = [t["topic"] for t in topics if t["avg_score"] >= 60]

    return {
        "overall_avg_score": overall_avg,
        "estimated_percentile": min(99, max(1, int(overall_avg * 0.9))),
        "topics": topics,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "coding": [
            {
                "problem_title": c.problem_title,
                "language": c.language,
                "passed": c.passed,
                "total": c.total,
            }
            for c in coding_attempts
        ],
        "interviews_completed": sum(1 for i in interviews if i.status == "completed"),
        "avg_interview_score": (
            round(sum(i.overall_score for i in interviews if i.overall_score) /
                  max(sum(1 for i in interviews if i.overall_score), 1), 1)
        ),
    }


@router.get("/report-card.pdf")
async def report_card_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_full_account),
):
    topics = await _topic_breakdown(db, current_user.id)
    coding_result = await db.execute(select(CodingAttempt).where(CodingAttempt.user_id == current_user.id))
    coding_attempts = coding_result.scalars().all()

    overall_avg = round(sum(t["avg_score"] for t in topics) / len(topics), 1) if topics else 0
    pdf_bytes = build_report_pdf(
        name=current_user.name or "Candidate",
        overall_percentile=min(99, max(1, int(overall_avg * 0.9))),
        topics=topics,
        coding=[
            {"problem_title": c.problem_title, "language": c.language, "passed": c.passed, "total": c.total}
            for c in coding_attempts
        ],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=nextround-report-card.pdf"},
    )
