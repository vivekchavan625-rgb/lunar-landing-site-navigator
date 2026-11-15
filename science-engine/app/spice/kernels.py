"""Kernel lifecycle. SPICE is process-global and NOT thread-safe -> every call goes through LOCK."""
from __future__ import annotations
import hashlib, json, os, threading
from pathlib import Path
import spiceypy as spice
from spiceypy.utils.support_types import SPICEDOUBLE_CELL

LOCK = threading.RLock()
KERNEL_DIR = Path(os.getenv("SPICE_KERNEL_DIR", "../data/kernels")).resolve()
META_KERNEL = Path(os.getenv("SPICE_META_KERNEL", str(KERNEL_DIR / "mission.tm"))).resolve()
MANIFEST = Path(os.getenv("KERNEL_MANIFEST", "../data/metadata/kernel_manifest.json")).resolve()
MOON_PA_FRAME_CLASS_ID = 31008  # ID of MOON_PA in moon_de440 FK (verify against the FK you load)

_loaded = False


class KernelError(RuntimeError):
    pass


class KernelCoverageError(KernelError):
    pass


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_manifest() -> list[str]:
    """Return list of problems; empty means all manifest kernels exist and match recorded checksums."""
    if not MANIFEST.exists():
        return [f"manifest missing: {MANIFEST} (run scripts/fetch_kernels.py)"]
    problems = []
    for k in json.loads(MANIFEST.read_text())["kernels"]:
        p = KERNEL_DIR / k["name"]
        if not p.exists():
            problems.append(f"missing kernel {k['name']}")
        elif sha256(p) != k["sha256"]:
            problems.append(f"checksum mismatch {k['name']}")
    return problems


def ensure_loaded() -> None:
    global _loaded
    with LOCK:
        if _loaded:
            return
        if not META_KERNEL.exists():
            raise KernelError(f"meta-kernel not found at {META_KERNEL}; run scripts/fetch_kernels.py")
        problems = verify_manifest()
        if problems:
            raise KernelError("; ".join(problems))
        cwd = os.getcwd()
        try:
            os.chdir(KERNEL_DIR)  # meta-kernel uses relative PATH_VALUES
            spice.furnsh(str(META_KERNEL))
        finally:
            os.chdir(cwd)
        _loaded = True


def _window_to_intervals(cell) -> list[tuple[float, float]]:
    n = spice.wncard(cell)
    return [tuple(spice.wnfetd(cell, i)) for i in range(n)]


def coverage_et() -> tuple[float, float]:
    """Intersection of SPK coverage (Sun, Earth, Moon vs SSB-chain) and lunar PCK coverage, in ET seconds."""
    ensure_loaded()
    lo, hi = -float("inf"), float("inf")
    with LOCK:
        count = spice.ktotal("SPK")
        for i in range(count):
            f_str = spice.kdata(i, "SPK")[0]
            f = Path(f_str)
            if not f.is_absolute():
                f = (KERNEL_DIR / f).resolve()
            for body in (10, 399, 301):
                cell = SPICEDOUBLE_CELL(2000)
                spice.spkcov(str(f), body, cell)
                iv = _window_to_intervals(cell)
                if iv:
                    lo, hi = max(lo, min(a for a, _ in iv)), min(hi, max(b for _, b in iv))
        for i in range(spice.ktotal("PCK")):
            f_str, ftype, *_ = spice.kdata(i, "PCK")
            f = Path(f_str)
            if not f.is_absolute():
                f = (KERNEL_DIR / f).resolve()
            if f.name.lower().endswith(".bpc"):
                cell = SPICEDOUBLE_CELL(2000)
                spice.pckcov(str(f), MOON_PA_FRAME_CLASS_ID, cell)
                iv = _window_to_intervals(cell)
                if iv:
                    lo, hi = max(lo, min(a for a, _ in iv)), min(hi, max(b for _, b in iv))
    return lo, hi


def require_coverage(et_start: float, et_end: float) -> None:
    lo, hi = coverage_et()
    if et_start < lo or et_end > hi:
        with LOCK:
            raise KernelCoverageError(
                f"requested interval outside kernel coverage: need {spice.et2utc(et_start,'ISOC',3)}.."
                f"{spice.et2utc(et_end,'ISOC',3)}, have {spice.et2utc(lo,'ISOC',3)}..{spice.et2utc(hi,'ISOC',3)}")


def loaded_kernel_names() -> list[str]:
    with LOCK:
        return [Path(spice.kdata(i, "ALL")[0]).name for i in range(spice.ktotal("ALL"))]
