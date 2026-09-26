import asyncio
import json
import re
from google import genai
from google.genai import types
from app.config import get_settings

settings = get_settings()
_client: genai.Client | None = None

# A single Gemini call reliably produces up to ~15 well-formed MCQs before
# output quality/JSON-validity degrades. For larger requests we run several
# batches concurrently and merge them — this is what actually makes "1 to
# a very large number of questions" work reliably rather than timing out or
# returning truncated JSON.
MCQ_BATCH_SIZE = 15
MAX_QUESTIONS_PER_REQUEST = 100


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env before using AI "
                "features. Get a free key at https://aistudio.google.com/apikey"
            )
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _extract_json(text: str):
    """Defensive fallback in case a response ever slips a stray fence past
    response_mime_type='application/json'."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
    if match:
        text = match.group(1)
    return json.loads(text)


async def _generate_json(prompt: str, system: str | None = None, max_tokens: int = 4000):
    """One-shot call that forces valid JSON output via Gemini's structured
    response mode, rather than hoping the model follows a "respond with only
    JSON" instruction."""
    client = get_client()
    config = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        max_output_tokens=max_tokens,
    )
    resp = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=config,
    )
    if not resp.text:
        raise RuntimeError("Gemini returned an empty response — try again.")
    return _extract_json(resp.text)


async def generate_mcqs(topic: str, difficulty: str, num_questions: int) -> list[dict]:
    """Generate MCQs, then run a second validation pass to check the answer key.

    For larger counts, splits the work into concurrent batches (see
    MCQ_BATCH_SIZE) rather than asking for everything in one Gemini call,
    which keeps generation reliable regardless of how many questions were
    requested.
    """
    if num_questions > MAX_QUESTIONS_PER_REQUEST:
        raise ValueError(f"Please request {MAX_QUESTIONS_PER_REQUEST} questions or fewer per test.")

    if num_questions <= MCQ_BATCH_SIZE:
        questions = await _generate_mcq_batch(topic, difficulty, num_questions)
        questions = await _validate_answer_key(topic, questions)
    else:
        batch_sizes = []
        remaining = num_questions
        while remaining > 0:
            batch_sizes.append(min(MCQ_BATCH_SIZE, remaining))
            remaining -= batch_sizes[-1]

        async def _one_batch(size: int):
            qs = await _generate_mcq_batch(topic, difficulty, size)
            return await _validate_answer_key(topic, qs)

        batches = await asyncio.gather(*[_one_batch(size) for size in batch_sizes])
        questions = [q for batch in batches for q in batch]

    # Renumber sequentially so IDs are always clean q1..qN regardless of batching
    for i, q in enumerate(questions, start=1):
        q["id"] = f"q{i}"
    return questions


async def _generate_mcq_batch(topic: str, difficulty: str, num_questions: int) -> list[dict]:
    gen_prompt = f"""Generate {num_questions} multiple-choice questions for a campus placement
test (TCS NQT / Infosys / Wipro style) on the topic "{topic}" at "{difficulty}" difficulty.

Return a JSON array. Each item must have this shape:
{{
  "id": "q1",
  "question": "string",
  "options": [{{"id": "a", "text": "..."}}, {{"id": "b", "text": "..."}}, {{"id": "c", "text": "..."}}, {{"id": "d", "text": "..."}}],
  "correct_option_id": "a",
  "explanation": "short explanation of why this is correct"
}}
Make questions realistic, unambiguous, and appropriate for {difficulty} difficulty. Vary the correct
option position across questions."""

    max_tokens = min(8000, num_questions * 220 + 500)
    return await _generate_json(gen_prompt, max_tokens=max_tokens)


async def _validate_answer_key(topic: str, questions: list[dict]) -> list[dict]:
    """Second pass: ask Gemini to re-check each answer key independently and fix any errors."""
    check_prompt = f"""You are validating an answer key for a {topic} multiple-choice quiz.
Here are the questions with their proposed correct answers as JSON:

{json.dumps(questions)}

For each question, independently verify the correct_option_id is actually correct. If any are
wrong, fix them. Return the corrected JSON array in the exact same shape."""

    try:
        return await _generate_json(check_prompt)
    except Exception:
        # If validation pass fails to parse, fall back to the original generation
        return questions


async def generate_coding_problem(topic: str, difficulty: str) -> dict:
    prompt = f"""Generate one coding interview problem on "{topic}" at "{difficulty}" difficulty,
in the style of a campus placement coding round. Return JSON in this exact shape:
{{
  "title": "string",
  "statement": "full problem statement in markdown, including constraints and 1-2 examples",
  "starter_code": {{
    "python": "a, b = map(int, input().split())\\nprint(a + b)",
    "javascript": "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(' ').map(Number);\\nconsole.log(a + b);",
    "cpp": "#include <iostream>\\nusing namespace std;\\nint main() {{ int a, b; cin >> a >> b; cout << a + b; }}",
    "java": "import java.util.Scanner;\\npublic class Main {{ public static void main(String[] args) {{ Scanner sc = new Scanner(System.in); int a = sc.nextInt(), b = sc.nextInt(); System.out.print(a + b); }} }}"
  }},
  "test_cases": [{{"input": "stdin text", "expected_output": "expected stdout text"}}],
  "function_name_hint": "solve"
}}
The example starter_code above is illustrative only — replace it with real starter code for THIS
problem, reading input from stdin and writing the answer to stdout, in all four languages. The
Java starter code's class MUST be named exactly "Main". Include 4-6 test cases covering edge
cases. Keep stdin/stdout format simple (values on separate lines or space-separated)."""

    return await _generate_json(prompt, max_tokens=3000)


async def interview_turn(role: str, mode: str, transcript: list[dict]) -> dict:
    """Given the conversation so far, get Gemini's next interviewer message + running feedback."""
    system = f"""You are an experienced {mode} interviewer conducting a mock interview for a
{role} campus placement position. Ask one question at a time, follow up naturally on the
candidate's last answer, and keep a professional, encouraging tone. After the candidate's most
recent answer, briefly flag (internally, not to the candidate) filler words or vagueness.

Return JSON in this exact shape:
{{
  "message": "your next interview question or follow-up, shown to the candidate",
  "feedback_on_last_answer": "1-2 sentence private feedback on their previous answer, or empty string if this is the first turn",
  "flags": ["filler_words" | "vague" | "too_short" | "strong_answer", ...],
  "should_end": false
}}
Set should_end to true after 6-8 exchanges to wrap up the interview."""

    # Gemini uses "model" rather than "assistant" for the AI's turns
    contents = [
        types.Content(role=("model" if t["role"] == "assistant" else "user"), parts=[types.Part.from_text(text=t["content"])])
        for t in transcript
    ] or [types.Content(role="user", parts=[types.Part.from_text(text="Let's begin.")])]

    client = get_client()
    config = types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json", max_output_tokens=1000)
    resp = await client.aio.models.generate_content(model=settings.GEMINI_MODEL, contents=contents, config=config)
    return _extract_json(resp.text)


async def final_interview_report(role: str, transcript: list[dict]) -> dict:
    prompt = f"""Here is a full mock interview transcript for a {role} candidate:

{json.dumps(transcript)}

Write a final performance report. Return JSON in this exact shape:
{{
  "overall_score": 0-100,
  "strengths": ["..."],
  "areas_to_improve": ["..."],
  "communication_notes": "1-2 sentences",
  "summary": "2-3 sentence overall summary"
}}"""
    return await _generate_json(prompt, max_tokens=1000)
