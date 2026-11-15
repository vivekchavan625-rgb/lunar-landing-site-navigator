from __future__ import annotations
import logging, os, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from app.models.schemas import CalculationRequest, CalculationResponse
from app.api.compute import run
from app.spice import kernels
from app.spice.provider import SpiceProvider
from app.validation.horizons import validate_horizons

log = logging.getLogger("science")
app = FastAPI(title="Lunar Science Engine", version="0.1.0")


class HorizonsValidateRequest(BaseModel):
    site: dict = Field(..., description="Site definition with latitude, longitude, coordinateType")
    times: list[str] = Field(..., description="List of ISO UTC time strings")


@app.middleware("http")
async def request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    resp = await call_next(request)
    resp.headers["x-request-id"] = rid
    return resp


@app.exception_handler(kernels.KernelCoverageError)
async def _cov(_, e):
    return JSONResponse(status_code=422, content={"error": {"code": "KERNEL_COVERAGE", "message": str(e)}})


@app.exception_handler(kernels.KernelError)
async def _kern(_, e):
    return JSONResponse(status_code=503, content={"error": {"code": "KERNEL_UNAVAILABLE", "message": str(e)}})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    problems = kernels.verify_manifest()
    return JSONResponse(status_code=200 if not problems else 503, content={"ready": not problems, "problems": problems})


@app.get("/v1/kernels")
def kernel_status():
    kernels.ensure_loaded()
    lo, hi = kernels.coverage_et()
    from app.spice import ephemeris
    return {"loaded": kernels.loaded_kernel_names(), "coverageStartUTC": ephemeris.et_to_utc_iso(lo),
            "coverageEndUTC": ephemeris.et_to_utc_iso(hi)}


@app.post("/v1/calculate", response_model=CalculationResponse)
def calculate(req: CalculationRequest):
    return run(req, SpiceProvider())


@app.post("/v1/validate/horizons")
def validate_horizons_endpoint(req: HorizonsValidateRequest):
    return validate_horizons(req.site, req.times)

