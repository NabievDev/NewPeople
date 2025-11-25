from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.database import engine, Base
from app.routers import auth, appeals, categories, tags, users

app = FastAPI(title="Citizens Appeals System - Новые Люди")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(appeals.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Citizens Appeals API - Новые Люди"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
