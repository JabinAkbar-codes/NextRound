from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Review
from app.schemas import ReviewCreateRequest
from app.deps import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

MAX_MESSAGE_LENGTH = 500


@router.get("")
async def list_reviews(db: AsyncSession = Depends(get_db)):
    """Public feed of the most recent reviews, newest first. Open to guests
    and full accounts alike -- anyone using the app can see what others
    thought of it."""
    result = await db.execute(select(Review).order_by(Review.created_at.desc()).limit(50))
    reviews = result.scalars().all()
    return {
        "reviews": [
            {
                "id": r.id,
                "display_name": r.display_name,
                "rating": r.rating,
                "message": r.message,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ]
    }


@router.post("")
async def create_review(
    payload: ReviewCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Please write a short message with your review")
    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Reviews are limited to {MAX_MESSAGE_LENGTH} characters")

    review = Review(
        user_id=current_user.id,
        display_name=current_user.name or "Anonymous",
        rating=payload.rating,
        message=message,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return {
        "id": review.id,
        "display_name": review.display_name,
        "rating": review.rating,
        "message": review.message,
        "created_at": review.created_at.isoformat(),
    }
