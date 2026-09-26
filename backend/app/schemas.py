from pydantic import BaseModel, EmailStr
from typing import Optional, Any


# ---------- Auth ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_guest: bool
    user_id: str
    name: Optional[str] = None


# ---------- Quiz ----------
class QuizGenerateRequest(BaseModel):
    topic: str          # DSA, OS, DBMS, CN, Aptitude, Verbal
    difficulty: str = "medium"  # easy | medium | hard
    num_questions: int = 10


class QuizSubmitRequest(BaseModel):
    attempt_id: str
    answers: dict[str, str]  # question_id -> selected_option_id
    time_taken_seconds: int = 0


# ---------- Coding ----------
class CodingGenerateRequest(BaseModel):
    topic: str = "arrays"
    difficulty: str = "medium"


class CodingRunRequest(BaseModel):
    attempt_id: str
    language: str  # python | cpp | java | javascript
    source_code: str


# ---------- Interview ----------
class InterviewStartRequest(BaseModel):
    role: str = "Software Engineer"
    mode: str = "technical"  # technical | hr


class InterviewReplyRequest(BaseModel):
    session_id: str
    message: str


# ---------- Multiplayer ----------
class RoomCreateRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    num_questions: int = 10


class RoomJoinRequest(BaseModel):
    code: str


# ---------- Reviews ----------
class ReviewCreateRequest(BaseModel):
    rating: int  # 1-5
    message: str
