# 🚀 Project Name

> One-line description of what your project does.

## Demo

<!-- Add a GIF or screenshot here -->

## What it does

<!-- 2–3 sentences explaining the problem and your solution -->

## Tech Stack

| Layer     | Tech                  |
|-----------|-----------------------|
| Frontend  | React, React Router   |
| Backend   | FastAPI (Python)      |
| ML        | scikit-learn / PyTorch |

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
python main.py             # runs on http://localhost:8000
```

API docs auto-generated at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm start                  # runs on http://localhost:3000
```

## Project Structure

```
├── backend/
│   ├── main.py            # FastAPI app entry point
│   ├── src/
│   │   ├── router.py      # API routes
│   │   ├── model.py       # Model loading
│   │   ├── predict.py     # Inference logic
│   │   └── utils.py       # Helpers
│   └── notebooks/         # Jupyter exploration
├── frontend/
│   └── src/
│       ├── pages/         # Route-level components
│       ├── components/    # Reusable components
│       ├── hooks/         # Custom React hooks
│       └── api.js         # API client
└── data/sample/           # Small sample data only
```

## Team

- Name — role
- Name — role

## License

MIT
