from fastapi import WebSocket


class RoomManager:
    """In-memory WebSocket room registry, keyed by room code.

    Correct and sufficient for running a single backend process (which is
    what this project does — no Docker, no orchestration). If you ever scale
    to multiple backend instances behind a load balancer, you'd need a
    shared pub/sub layer so instances can relay messages to each other's
    sockets -- the broadcast() call sites below are exactly where that swap
    would go.
    """

    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = {}
        self.scores: dict[str, dict[str, int]] = {}

    async def connect(self, code: str, user_id: str, user_name: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(code, {})[user_id] = ws
        self.scores.setdefault(code, {}).setdefault(user_id, 0)
        await self.broadcast(code, {
            "type": "player_joined",
            "user_id": user_id,
            "name": user_name,
            "players": list(self.rooms[code].keys()),
        })

    def disconnect(self, code: str, user_id: str):
        if code in self.rooms and user_id in self.rooms[code]:
            del self.rooms[code][user_id]
        if code in self.rooms and not self.rooms[code]:
            del self.rooms[code]

    async def broadcast(self, code: str, message: dict):
        for ws in list(self.rooms.get(code, {}).values()):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    def add_score(self, code: str, user_id: str, points: int):
        self.scores.setdefault(code, {}).setdefault(user_id, 0)
        self.scores[code][user_id] += points

    def leaderboard(self, code: str) -> list[dict]:
        board = self.scores.get(code, {})
        return sorted(
            [{"user_id": uid, "score": s} for uid, s in board.items()],
            key=lambda x: x["score"],
            reverse=True,
        )


room_manager = RoomManager()
