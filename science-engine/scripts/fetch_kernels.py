"""Download kernels from the catalog, record SHA-256 manifest (trust-on-first-use), refuse non-NAIF hosts.

Usage: python scripts/fetch_kernels.py [--catalog ../data/metadata/kernel_catalog.json] [--out ../data/kernels]
After the first run, COMMIT kernel_manifest.json (not the kernels). Later runs verify against it.
Compare recorded hashes with NAIF-published values where NAIF provides them.
"""
import argparse, hashlib, json, sys
from pathlib import Path
from urllib.parse import urlparse
import httpx

ALLOWED_HOSTS = {"naif.jpl.nasa.gov"}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default="../data/metadata/kernel_catalog.json")
    ap.add_argument("--out", default="../data/kernels")
    ap.add_argument("--manifest", default="../data/metadata/kernel_manifest.json")
    a = ap.parse_args()
    out, mpath = Path(a.out), Path(a.manifest)
    out.mkdir(parents=True, exist_ok=True)
    prior = {k["name"]: k for k in json.loads(mpath.read_text())["kernels"]} if mpath.exists() else {}
    entries, rc = [], 0
    for k in json.loads(Path(a.catalog).read_text())["kernels"]:
        if urlparse(k["url"]).hostname not in ALLOWED_HOSTS:
            print(f"REFUSED non-allowlisted host: {k['url']}"); rc = 1; continue
        dest = out / k["name"]
        if not dest.exists():
            print(f"downloading {k['name']} ...")
            with httpx.stream("GET", k["url"], timeout=120, follow_redirects=True) as r:
                if r.status_code != 200:
                    print(f"FAILED {k['name']}: HTTP {r.status_code} (check NAIF listing)"); rc = 1; continue
                with open(dest, "wb") as f:
                    for chunk in r.iter_bytes():
                        f.write(chunk)
        digest = sha256(dest)
        if k["name"] in prior and prior[k["name"]]["sha256"] != digest:
            print(f"CHECKSUM MISMATCH {k['name']}"); rc = 1; continue
        entries.append({**k, "sha256": digest, "size_bytes": dest.stat().st_size})
    if rc == 0:
        mpath.write_text(json.dumps({"kernels": entries}, indent=2))
        print(f"manifest written: {mpath}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
