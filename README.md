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

## 🛠 Setup

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

# Project Structure
Plaintext
AI-POWERED-WEB-APPLICATION/
├── backend/
│   ├── main.py             # FastAPI entry point & AI logic
│   └── requirements.txt    # Backend dependencies (FastAPI, PyPDF2, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DocumentSummarizer.jsx  # Primary UI component
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