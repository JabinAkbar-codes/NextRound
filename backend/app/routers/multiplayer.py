import random
import string
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models import User, MultiplayerRoom
from app.schemas import RoomCreateRequest, RoomJoinRequest
from app.deps import require_full_account
from app.services.ai_service import generate_mcqs, MAX_QUESTIONS_PER_REQUEST
from app.security import decode_access_token
from app.ws_manager import room_manager

router = APIRouter(prefix="/api/rooms", tags=["multiplayer"])


def _gen_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.post("/create")
async def create_room(
    payload: RoomCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_full_account),
):
    if payload.num_questions < 1 or payload.num_questions > MAX_QUESTIONS_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"num_questions must be between 1 and {MAX_QUESTIONS_PER_REQUEST}")

    questions = await generate_mcqs(payload.topic, payload.difficulty, payload.num_questions)
    code = _gen_code()
    room = MultiplayerRoom(
        code=code,
        host_user_id=current_user.id,
        topic=payload.topic,
        difficulty=payload.difficulty,
        questions_json=questions,
    )
    db.add(room)
    await db.commit()
    return {"code": code, "num_questions": len(questions)}


@router.post("/join")
async def join_room(
    payload: RoomJoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_full_account),
):
    result = await db.execute(select(MultiplayerRoom).where(MultiplayerRoom.code == payload.code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "finished":
        raise HTTPException(status_code=400, detail="This room's battle has already ended")
    return {"code": room.code, "topic": room.topic, "difficulty": room.difficulty}


@router.websocket("/ws/{code}")
async def room_socket(websocket: WebSocket, code: str, token: str):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4401)
        return
    user_id = payload["sub"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(MultiplayerRoom).where(MultiplayerRoom.code == code))
        room = result.scalar_one_or_none()
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

    if not room or not user:
        await websocket.close(code=4404)
        return

    await room_manager.connect(code, user_id, user.name or "Player", websocket)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start" and user_id == room.host_user_id:
                await room_manager.broadcast(code, {
                    "type": "battle_started",
                    "questions": [
                        {"id": q["id"], "question": q["question"], "options": q["options"]}
                        for q in room.questions_json
                    ],
                })

            elif msg_type == "answer":
                qid = data.get("question_id")
                selected = data.get("selected")
                time_ms = data.get("time_ms", 0)
                question = next((q for q in room.questions_json if q["id"] == qid), None)
                if question and selected == question["correct_option_id"]:
                    # Faster correct answers earn more points, like a live kahoot-style battle
                    points = max(100, 1000 - int(time_ms / 20))
                    room_manager.add_score(code, user_id, points)
                await room_manager.broadcast(code, {
                    "type": "leaderboard_update",
                    "leaderboard": room_manager.leaderboard(code),
                })

            elif msg_type == "finish" and user_id == room.host_user_id:
                await room_manager.broadcast(code, {
                    "type": "battle_finished",
                    "leaderboard": room_manager.leaderboard(code),
                })

    except WebSocketDisconnect:
        room_manager.disconnect(code, user_id)
        await room_manager.broadcast(code, {"type": "player_left", "user_id": user_id})
