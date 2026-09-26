# NextRound — AI-Powered Placement Preparation Platform

NextRound is a full-stack AI-powered placement preparation platform designed to simulate real campus recruitment assessments. The platform provides adaptive MCQ quizzes, live coding challenges, AI mock interviews, multiplayer quiz battles, and performance analytics to help students prepare for technical and aptitude rounds with an experience similar to major placement exams.

## Features

### Adaptive MCQ Quiz Engine

* AI-generated questions for DSA, OS, DBMS, CN, Aptitude, and Verbal topics
* Dynamic difficulty adjustment based on user performance
* Timed assessments with automatic submission
* Answer validation before display

### Live Coding Round

* In-browser code editor
* Multi-language code execution
* Automatic evaluation using hidden test cases
* Real-time scoring and feedback

### AI Mock Interview

* Technical and HR interview simulation
* Text and voice interaction support
* Feedback on communication quality
* Performance tracking across sessions

### Multiplayer Quiz Battles

* Real-time quiz rooms using WebSockets
* Live leaderboard updates
* Competitive placement preparation experience
* Friend-based room participation

### Analytics Dashboard

* Topic-wise performance analysis
* Strong and weak area identification
* Progress tracking
* Downloadable PDF report cards

### Guest Mode Support

* No signup required to start practicing
* Temporary guest sessions
* Seamless migration of progress after account creation

---

## Tech Stack

### Backend

* FastAPI
* SQLAlchemy 2.0 (Async)
* SQLite
* JWT Authentication
* Google Gemini API
* FastAPI WebSockets
* xhtml2pdf
* Jinja2
* Uvicorn

### Frontend

* React 18
* Vite
* React Router v6
* Mantine UI
* Tailwind CSS v4
* CSS Modules
* Framer Motion
* React Hot Toast
* Tabler Icons
* clsx

### Browser APIs

* Web Speech API
* Web Audio API

---

## Key Highlights

* AI-generated unlimited practice content
* Real-time multiplayer quiz battles
* Live coding assessment environment
* AI-powered interview preparation
* Guest-to-account migration workflow
* Fully responsive mobile-first design
* Modern UI with accessibility support
* Purpose-driven animations and smooth user experience

---

## Installation

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Backend:

```env
SECRET_KEY=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
JWT_ALGORITHM=HS256
```

Frontend:

```env
VITE_API_URL=http://localhost:8000
```

---

## Future Enhancements

* Company-specific placement tracks
* Resume-based personalized learning paths
* Advanced interview analytics
* Achievement and ranking system
* PostgreSQL migration for production deployments
* Enhanced AI coaching and recommendations

---

## Project Goal

NextRound was built to provide a realistic, accessible, and AI-driven placement preparation experience that helps students strengthen technical skills, improve interview performance, and track progress through a single integrated platform.

