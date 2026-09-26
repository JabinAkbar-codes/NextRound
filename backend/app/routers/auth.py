from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import User, QuizAttempt, CodingAttempt, InterviewSession
from app.schemas import SignupRequest, LoginRequest, TokenResponse
from app.security import hash_password, verify_password, create_access_token
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/guest", response_model=TokenResponse)
async def create_guest_session(db: AsyncSession = Depends(get_db)):
    """Called automatically when the app opens with no token — creates a throwaway guest user."""
    guest = User(is_guest=True, name="Guest")
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    token = create_access_token(guest.id, is_guest=True)
    return TokenResponse(access_token=token, is_guest=True, user_id=guest.id, name=guest.name)


@router.post("/signup", response_model=TokenResponse)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upgrades the current guest session into a full account, migrating all guest data."""
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if current_user.is_guest:
        # Upgrade in place -- guest_id stays the same, so all attempts/sessions migrate for free
        current_user.email = payload.email
        current_user.password_hash = hash_password(payload.password)
        current_user.name = payload.name
        current_user.is_guest = False
        await db.commit()
        await db.refresh(current_user)
        user = current_user
    else:
        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            name=payload.name,
            is_guest=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id, is_guest=False)
    return TokenResponse(access_token=token, is_guest=False, user_id=user.id, name=user.name)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(user.id, is_guest=False)
    return TokenResponse(access_token=token, is_guest=False, user_id=user.id, name=user.name)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_guest": current_user.is_guest,
        "target_role": current_user.target_role,
    }
