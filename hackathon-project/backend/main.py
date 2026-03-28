from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.router import router
from src.auth import init_db

app = FastAPI(
    title="NL Dataset Cleaner API",
    description="Upload a CSV and clean it using natural language commands.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "NL Dataset Cleaner API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)