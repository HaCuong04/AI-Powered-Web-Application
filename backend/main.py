import os
import time
import PyPDF2
import uuid
from collections import defaultdict

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ─── Setup ────────────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set — copy .env.example to .env and add your key")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash-lite")

app = FastAPI(title="Document summarizer")


# Allow requests from the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate limiting (in-memory, per session) ────────────────────────────────────
# In production: use Redis + sliding window per authenticated user

RATE_LIMIT_REQUESTS = 10   # max requests per window
RATE_LIMIT_WINDOW = 60     # seconds

request_timestamps: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(session_id: str) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    # Drop timestamps outside the window
    request_timestamps[session_id] = [
        t for t in request_timestamps[session_id] if t > window_start
    ]
    if len(request_timestamps[session_id]) >= RATE_LIMIT_REQUESTS:
        return False
    request_timestamps[session_id].append(now)
    return True


# ─── Cost estimation ──────────────────────────────────────────────────────────
# Gemini 2.5 Flash Lite pricing (as of 2025, per million tokens)
INPUT_COST_PER_M = 0.10
OUTPUT_COST_PER_M = 0.40


def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens / 1_000_000) * INPUT_COST_PER_M + \
           (output_tokens / 1_000_000) * OUTPUT_COST_PER_M


# State memory for the session
document_state = {}
session_quotas = {}

@app.get("/api/rate-limit/{session_id}")
async def get_limit(session_id: str):
    # If it's a new session, start them at 10
    if session_id not in session_quotas:
        session_quotas[session_id] = 10
        
    return {
        "remaining": session_quotas[session_id],
        "limit": 10,
        "window": 60
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
    
    content = await file.read()
    extracted_text = ""
    
    if file.filename.endswith('.pdf'):
        temp_filename = f"temp_{uuid.uuid4()}.pdf"
        with open(temp_filename, "wb") as f:
            f.write(content)
        try:
            with open(temp_filename, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted_text += page.extract_text() + "\n"
        finally:
            os.remove(temp_filename)
    else:
        extracted_text = content.decode("utf-8")
        
    session_id = str(uuid.uuid4())
    document_state[session_id] = extracted_text
    
    return {"message": "File processed successfully", "session_id": session_id}

@app.post("/api/summarize")
async def summarize_document(
    session_id: str = Form(...),
    length: str = Form("medium"),
    focus_area: str = Form("general")
):
    # 1. Validate Session
    if session_id not in document_state:
        raise HTTPException(status_code=404, detail="Session expired or invalid. Please re-upload.")
    
    # 2. Check Quota
    # Initialize quota if it's the first time for this session
    if session_id not in session_quotas:
        session_quotas[session_id] = 10 
        
    if session_quotas[session_id] <= 0:
        raise HTTPException(status_code=429, detail="Rate limit reached for this session.")

    # 3. Prepare AI Logic
    document_text = document_state[session_id]
    
    length_instructions = {
        "short": "Provide a brief 1-paragraph summary (max 4 sentences, 100-150 words). No headers.",
        "medium": "Provide a balanced 3-paragraph summary (200-350 words). No bullet points.",
        "long": "Provide a detailed summary with subheadings and bullet points (400+ words)."
    }
    
    length_prompt = length_instructions.get(length, length_instructions["medium"])
    focus_prompt = (
        f"Heavily focus on: {focus_area}." 
        if focus_area.strip() and focus_area.lower() != "general" 
        else "Provide a comprehensive general overview."
    )
    
    prompt = (
        f"You are a professional document analyst. Summarize strictly:\n"
        f"FORMAT: {length_prompt}\n"
        f"FOCUS: {focus_prompt}\n\n"
        f"DOCUMENT TEXT:\n{document_text[:30000]}"
    )
    
    # 4. Generate AI Content
    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.7, "top_p": 0.95}
        )
        
        # 5. DEDUCT QUOTA (The "Magic" Step)
        session_quotas[session_id] -= 1
        
        # Return summary AND the new cost/quota info if you like
        return {
            "summary": response.text,
            "remaining": session_quotas[session_id]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")

@app.get("/api/rate-limit/{session_id}")
async def get_limit(session_id: str):
    # This is where the values are created
    return {
        "remaining": 5, 
        "limit": 10,
        "window": 60
    }