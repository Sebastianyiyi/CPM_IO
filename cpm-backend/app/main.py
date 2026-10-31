from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .cpm import AOAError, solve_cpm
from .models import CPMRequest, CPMResponse


app = FastAPI(
    title="CPM API",
    version="1.0.0",
    description="Resolución en memoria del método CPM con red AOA.",
)

configured_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/cpm/solve", response_model=CPMResponse)
def solve(request: CPMRequest) -> CPMResponse:
    try:
        return solve_cpm(request.activities)
    except AOAError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
