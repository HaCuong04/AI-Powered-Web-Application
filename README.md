# AI-Powered Document Summarizer

A high-performance full-stack application that transforms long documents into concise, actionable summaries using the **Gemini 2.5 Flash Lite** model.

## 🚀 Features

- **Multi-Format Upload:** Seamlessly process `.pdf` and `.txt` files.
- **Precision Length Control:** - **Short:** A 3-sentence "executive" overview.
- **Medium:** A balanced 2-paragraph summary with enhanced detail.
- **Long:** A detailed breakdown featuring subheadings and bullet points.
- **Targeted Focus:** Ability to steer the AI toward specific areas (e.g., "Experience," "Technical Skills," or "Education").
- **Optimized Backend:** Built with FastAPI for high-concurrency and efficient token management.

---

## 🏗 Architecture Overview

The application follows a modern decoupled architecture:

**React (Frontend) → FastAPI (Backend) → Gemini 2.5 (LLM)**

1.  **Frontend:** A React SPA (Single Page Application) built with Vite. It handles file uploads and UI state.
2.  **Backend:** A Python FastAPI server that manages file processing (extracting text from PDFs) and communicates with the AI.
3.  **LLM:** Google's **Gemini 2.5 Flash Lite** model, which performs the actual analysis and summarization.

---

## 🛠 Technical Choices

-   **FastAPI:** Chosen for its high performance and native support for asynchronous requests, which is critical when waiting for AI API responses.
-   **Gemini 2.5 Flash Lite:** Selected for its extremely low latency and cost-effectiveness while maintaining a high "intelligence" ceiling for summarization tasks.
-   **PyPDF2:** A lightweight, reliable library for extracting text from PDF documents without needing heavy external dependencies like OCR engines.
-   **Vite:** Used for the frontend build tool because it provides a significantly faster development experience compared to Create React App.

---

## 🚀 Setup and Running Instructions

### Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18.0 or higher
- **API Key:** A valid [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install required packages
pip install -r requirements.txt

# Configure environment variables
# Create a .env file and add:
# GEMINI_API_KEY=your_actual_key_here

# Launch the FastAPI server
uvicorn main:app --reload
The API will be live at http://localhost:8000.

2. Frontend Setup

In a new terminal window:

Bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
The application will be accessible at http://localhost:5173.

⚠️ Known Limitations
Token Limit: Currently processes the first 30,000 characters of a document (~7,500 tokens). Very large books will be truncated.

OCR: The app reads text-based PDFs. It cannot currently read "scanned" PDFs (images of text).

Memory: Session state is stored in-memory. If the backend restarts, current upload sessions are lost.

Production Readiness: For a production environment, the in-memory rate limiting should be replaced with a Redis-based solution.

🤖 AI Tools Used in Development
This project was developed with the assistance of:

Gemini:
FastAPI-Backend-Scaffolding: I used Gemini to generate the boilerplate structure for the Python backend. It helped me quickly set up the API routing, configure CORS for secure communication, and implement the logic for session-based rate limiting.

React-State-Management: I turned to Gemini to troubleshoot complex state flows in the frontend. It was instrumental in ensuring that the asynchronous transition from file upload to session ID generation, and finally to the AI summary, remained synchronized and bug-free.

Persistent-History-Logic: To make the app feel professional, I used Gemini to write the integration for localStorage. This allows the "Recent Summaries" sidebar to persist across browser refreshes, providing a seamless user experience.

Document-Exporting: I leveraged Gemini to handle the technical nuances of the jsPDF library. It helped me format the raw AI output into a clean, structured PDF report with proper margins, headers, and line wrapping.

UI/UX-Guardrails: Gemini helped me implement conditional rendering and logic, such as dynamically disabling the "Generate" button when the rate limit is reached, ensuring the app remains stable and informative for the user.

Gemini (LLM): Used specifically to refine the "Summarization Logic" prompts to ensure that "Medium" summaries were consistently more detailed than "Short" ones.

GitHub Copilot: Assisted with writing repetitive CSS and unit test structures.

# Project Structure

AI-POWERED-WEB-APPLICATION/
├── backend/
│   ├── main.py             # FastAPI entry point & AI logic
│   └── requirements.txt    # Backend dependencies (FastAPI, PyPDF2, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Icons.jsx  # Primary UI component
│   │   ├── App.jsx         # Component orchestration
│   │   ├── index.css       # Global styling & layout
│   │   └── main.jsx        # React entry point
│   ├── index.html          # Base template
│   ├── package.json        # Frontend scripts & dependencies
│   └── vite.config.js      # Vite build configuration
├── .env                    # Local environment variables
├── .env.example            # Environment template
├── .gitignore              # Git exclusion rules
└── README.md               # Project documentation