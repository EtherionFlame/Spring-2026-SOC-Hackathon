# 🧹 NL Dataset Cleaner

A full-stack web application that lets you upload any CSV and clean, visualize, analyze, and train machine learning models on it — all using plain-English commands. Built for the Spring 2026 SOC Hackathon by **Evan Hudson** and **Clay Barr**.

> **Powered by:** Llama 3.2 (via Ollama) · FastAPI · React · scikit-learn · SQLite

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup — Backend](#setup--backend)
- [Setup — Frontend](#setup--frontend)
- [Setup — Ollama Local LLM](#setup--ollama-local-llm)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Usage Guide](#usage-guide)
- [Security Notes](#security-notes)
- [Partner Onboarding](#partner-onboarding)

---

## Features

| Category | What you can do |
|---|---|
| **CSV Upload** | Drag-and-drop any `.csv` file, get an instant 10-row preview |
| **NL Cleaning** | Type commands like *"remove outliers in cholesterol"* or *"fill missing values with median in age"* |
| **Visualization** | Ask for a correlation heatmap, scatter plot, distribution, box plot, bar chart, or cluster diagram |
| **Statistics** | Get mean, median, mode, std, skewness, Q1/Q3, null count, and more for any column or the whole dataset |
| **ML Training** | Train a Random Forest, Logistic Regression, or Linear Regression model on your cleaned data; get metrics + charts |
| **Download** | Export cleaned CSV, save chart PNGs, or download stats as CSV |
| **Auth** | Register / login with JWT; sessions persist on page refresh; guest access always allowed |
| **History** | Logged-in users can view past sessions and their full cleaning logs |

---

## Tech Stack

**Backend**
- Python 3.11 or 3.12 (recommended — see note below)
- FastAPI + Uvicorn
- pandas, NumPy
- Matplotlib + Seaborn (server-side chart rendering to base64 PNG)
- scikit-learn (Random Forest, Logistic Regression, Linear Regression)
- python-jose (JWT / HS256)
- bcrypt (password hashing)
- SQLite (via Python stdlib `sqlite3`)
- httpx (Ollama REST client)

**Frontend**
- React 18 + Vite
- React Router v6
- Axios (with auto-attaching JWT interceptor)
- Inline styles (no CSS framework dependency)

**LLM**
- Ollama running locally with the `llama3.2` model

> **Python 3.14 note:** scikit-learn may fail to build from source on Python 3.14. If you run into issues, use Python 3.12 instead (`py -3.12 -m venv venv`).

---

## Project Structure

```
hackathon-project/
├── README.md
├── backend/
│   ├── main.py               # FastAPI app entry point, CORS, DB init
│   ├── requirements.txt      # All Python dependencies
│   └── src/
│       ├── router.py         # All API endpoints (/upload, /clean, /train, /auth, etc.)
│       ├── cleaner.py        # NL command → Ollama → whitelisted pandas operation pipeline
│       ├── visualizer.py     # Chart generators (heatmap, scatter, box, cluster, etc.)
│       ├── stats.py          # Descriptive statistics (mean, median, skewness, etc.)
│       ├── trainer.py        # ML model training (Random Forest, Logistic/Linear Regression)
│       ├── auth.py           # JWT creation/verification, bcrypt hashing, SQLite schema
│       ├── ollama_client.py  # httpx client that calls the local Ollama REST API
│       └── utils.py          # In-memory session store (dict of session_id → DataFrame)
└── frontend/
    ├── vite.config.js        # Vite dev server on port 3000, proxies /api → localhost:8000
    ├── package.json
    └── src/
        ├── App.jsx           # Route definitions + AuthProvider wrapper
        ├── api.js            # Axios instance + all exported API functions
        ├── context/
        │   └── AuthContext.jsx   # Global JWT state stored in sessionStorage
        ├── components/
        │   └── Navbar.jsx        # Top nav bar with auth-aware links
        └── pages/
            ├── Home.jsx          # Landing page with feature overview + example commands
            ├── Upload.jsx        # Drag-and-drop CSV upload page
            ├── Dashboard.jsx     # Main workspace — NL commands, results, previews
            ├── Train.jsx         # Multi-step ML model training page
            ├── History.jsx       # Past sessions + cleaning logs (requires login)
            ├── Login.jsx         # Login form
            └── Register.jsx      # Registration form with password strength indicator
```

---

## Prerequisites

Make sure all of the following are installed before you begin:

| Tool | Minimum Version | Download |
|---|---|---|
| Python | 3.11 (3.12 recommended) | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| Git | Any recent version | https://git-scm.com |
| Ollama | Latest | https://ollama.com/download |

---

## Setup — Backend

### 1. Open a terminal and navigate to the backend folder

```bash
cd hackathon-project/backend
```

### 2. Create a virtual environment

**Windows (PowerShell)**
```powershell
py -m venv venv
```

**macOS / Linux**
```bash
python3 -m venv venv
```

### 3. Activate the virtual environment

**Windows (PowerShell)**
```powershell
.\venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source venv/bin/activate
```

You should see `(venv)` at the start of your terminal prompt.

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

> If `pip install` hangs on building `scikit-learn` from source, try:
> ```bash
> pip install scikit-learn --prefer-binary
> ```

---

## Setup — Frontend

### 1. Open a second terminal and navigate to the frontend folder

```bash
cd hackathon-project/frontend
```

### 2. Install Node dependencies

```bash
npm install
```

This may take a minute. Deprecation warnings are safe to ignore.

---

## Setup — Ollama Local LLM

The backend sends every natural-language command to a locally running Ollama instance for interpretation. This requires a one-time setup.

### 1. Install Ollama

**Windows**
```powershell
winget install Ollama.Ollama
```
Or download the installer directly from https://ollama.com/download/windows

**macOS**
```bash
brew install ollama
```

### 2. Pull the Llama 3.2 model (one-time, ~2 GB download)

```bash
ollama pull llama3.2
```

### 3. Verify Ollama is working

```bash
ollama list
```

You should see `llama3.2` in the list.

---

## Running the App

You need **three** processes running simultaneously, each in its own terminal.

### Terminal 1 — Ollama (Local LLM)

```bash
ollama serve
```

> If you see `Error: listen tcp 127.0.0.1:11434: bind: Only one usage of each socket address`, Ollama is already running in the background — this is fine, no action needed.

### Terminal 2 — Backend API

```bash
cd hackathon-project/backend

# Activate venv first (Windows)
.\venv\Scripts\Activate.ps1
# or (macOS/Linux)
source venv/bin/activate

# Start the server
py -m uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### Terminal 3 — Frontend

```bash
cd hackathon-project/frontend
npm run dev
```

Expected output:
```
  VITE v5.x  ready in Xms
  ➜  Local:   http://localhost:3000/
```

Open **http://localhost:3000** in your browser.

---

## API Reference

All endpoints are prefixed with `/api`. Interactive Swagger docs are available at **http://localhost:8000/docs**.

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Create account, returns JWT token |
| `POST` | `/api/auth/login` | No | Log in, returns JWT token |
| `POST` | `/api/upload` | Optional | Upload a CSV file, returns session ID + preview |
| `GET` | `/api/session/{session_id}` | No | Get current session state and column list |
| `POST` | `/api/clean` | Optional | Run a natural-language command on the session |
| `POST` | `/api/train` | No | Train an ML model on the current session data |
| `GET` | `/api/download/{session_id}` | No | Download the current (cleaned) DataFrame as CSV |
| `GET` | `/api/history` | **Yes** | Get the authenticated user's past sessions and logs |

### Example: POST /api/train

```json
{
  "session_id": "abc123",
  "model_type": "random_forest",
  "target_col": "target",
  "feature_cols": ["age", "cholesterol", "trestbps"],
  "test_size": 0.2
}
```

`model_type` must be one of: `random_forest`, `logistic_regression`, `linear_regression`

---

## Usage Guide

### Cleaning Commands

Type these into the command box on the Dashboard:

```
remove outliers in cholesterol
fill missing values with median in age
fill missing values with mean in salary
normalize trestbps
drop duplicate rows
drop rows with null values in blood_pressure
encode onehot for gender
rename column old_name to new_name
drop column id
```

### Visualization Commands

```
show correlation heatmap
plot distribution of age
scatter plot of age vs cholesterol
box plot of salary
bar chart of department
show 3 clusters of age and salary
```

### Statistics Commands

```
describe the dataset
statistics for age
summarize cholesterol
show mean and median of salary
statistics for department
```

### ML Model Training

1. From the Dashboard, click **🤖 Train Model** in the header
2. **Step 1 — Choose a model:**
   - **Random Forest** — ensemble of decision trees; handles non-linear data; auto-detects classification vs regression
   - **Logistic Regression** — predicts a categorical outcome (yes/no, class A/B/C); classification only
   - **Linear Regression** — predicts a continuous number (price, temperature, score); regression only
3. **Step 2 — Select columns:**
   - **Target column** — the column you want to predict
   - **Feature columns** — the input columns the model learns from (click to toggle, or use "Select all")
   - **Train/test split** — how much data to hold out for evaluation (default: 20%)
4. Click **🚀 Train Model**

**Classification results:** Accuracy, Precision, Recall, F1 Score + Confusion Matrix + Feature Importance chart

**Regression results:** R², RMSE, MAE, MSE + Predicted vs Actual scatter + Residuals plot + Feature Importance chart (Random Forest only)

All charts can be downloaded as PNG files directly from the results page.

---

## Security Notes

- **No `eval()` or `exec()` anywhere.** Natural-language commands are mapped to a strict whitelist of pandas operations. Arbitrary code execution is impossible by design.
- Passwords are hashed with **bcrypt** (cost factor 12). Plaintext passwords are never stored or logged.
- Authentication uses **JWT (HS256)** tokens that expire after 24 hours.
- All database queries use **parameterized statements** — SQL injection is not possible.
- Password requirements enforced on both frontend and backend: 8–50 characters, must include uppercase, lowercase, number, and special character.
- Session DataFrames are stored **in-memory only** and are cleared when the backend restarts.

---

## Partner Onboarding

If your partner needs to sync with the latest code:

```bash
# Pull the latest changes
git pull origin main

# Re-install any new backend dependencies
cd hackathon-project/backend
.\venv\Scripts\Activate.ps1    # Windows
pip install -r requirements.txt

# Re-install any new frontend dependencies
cd ../frontend
npm install
```

If your partner does not have a virtual environment yet:

```bash
cd hackathon-project/backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
