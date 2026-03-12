import os
from dotenv import load_dotenv

# Load environment variables from .env file located at the project root
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import models
from database import engine

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Student Budget AI API")

# Configure CORS so the frontend can easily communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local development/hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Student Budget AI API"}

from routes import auth, wallet, budget, ai_support, offers

app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(budget.router)
app.include_router(ai_support.router)
app.include_router(offers.router)

# Serve static files (HTML, CSS, JS) from the root directory for local dev
app.mount("/static", StaticFiles(directory="../"), name="static")
