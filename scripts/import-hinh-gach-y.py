# -*- coding: utf-8 -*-
"""
Import ảnh từ Y:\\HÌNH GẠCH vào CRM SQLite.

  python scripts/import-hinh-gach-y.py --pass A          # tên file + HÌNH MAP
  python scripts/import-hinh-gach-y.py --pass B          # OCR phần chưa match
  python scripts/import-hinh-gach-y.py --pass A --dry-run
  python scripts/import-hinh-gach-y.py --pass all        # A rồi B

Cache OCR: data/import_hinh_gach_ocr_cache.json
Report:    data/import_hinh_gach_report.json
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"Y:\HÌNH GẠCH")
CRM = Path(r"C:\Users\dankiet\Documents\CRM")
DB_PATH = CRM / "data" / "crm.db"
OUT_MAP = CRM / "public" / "products"
OUT_CONCEPT = CRM / "public" / "products" / "concepts"
OUT_MAP.mkdir(parents=True, exist_ok=True)
OUT_CONCEPT.mkdir(parents=True, exist_ok=True)
(CRM / "public" / "products" / "uploads").mkdir(parents=True, exist_ok=True)

CACHE_PATH = CRM / "data" / "import_hinh_gach_ocr_cache.json"
REPORT_PATH = CRM / "data" / "import_hinh_gach_report.json"
INDEX_PATH = CRM / "data" / "import_hinh_gach_file_index.json"

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

# Skip folders (substring match, casefold)
SKIP_PARTS = {
    "bỏ mẫu",
    "bo mau",
    "logo",
    "banner picture",
    "thumbs.db",
    ".ds_store",
}

CODE_RE = re.compile(
    r"^[A-Za-z]{0,8}\d{2,6}[A-Za-z0-9\-]*$"
    r"|^\d{4,6}[A-Za-z]{0,4}$"
)

NOISE_CODES = {
    "JPEG",
    "PNG",
    "JPG",
    "IMG",
    "IMAGE",
    "CODE",
    "SIZE",
    "MM",
    "CM",
    "DSC",
    "IMG_",
}


def norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())


def should_skip(path: Path) -> bool:
    parts = [p.casefold() for p in path.parts]
    for sk in SKIP_PARTS:
        if any(sk in p for p in parts):
            return True
    name = path.name.casefold()
    if name in ("thumbs.db", ".ds_store") or name.endswith((".pdf", ".xlsx", ".zip", ".db")):
        return True
    return False


def guess_kind(path: Path) -> str:
    s = str(path).casefold()
    if "hình map" in s or "hinh map" in s or "\\map " in s or "/map " in s:
        return "map"
    if "concept" in s or "moodboard" in s:
        return "concept"
    return "map"  # default primary catalog shot


def stem_candidates(stem: str) -> list[str]:
    """Possible product codes from filename stem."""
    stem = re.sub(r"\s*\(\d+\)$", "", stem).strip()
    stem = re.sub(r"\s+\d+[Vv]?$", "", stem).strip()  # "BH109 1V"
    cands: list[str] = []
    # full stem
    if CODE_RE.match(stem.replace(" ", "")) or CODE_RE.match(stem):
        cands.append(stem.replace(" ", ""))
    # first token
    tok = re.split(r"[\s_]+", stem)[0]
    tok = re.sub(r"[^\w\-]", "", tok)
    if tok:
        cands.append(tok)
    # tokens like IN6201, MD7534M12
    for m in re.finditer(r"[A-Za-z]{1,8}\d{2,6}[A-Za-z0-9\-]*|\d{4,6}[A-Za-z]{0,4}", stem):
        cands.append(m.group(0))
    # before underscore size suffix MF48Y00C_400x800
    m = re.match(r"^([A-Za-z0-9\-]+?)(?:_\d+x\d+|$)", stem, re.I)
    if m:
        cands.append(m.group(1))
    # unique preserve order
    out: list[str] = []
    seen: set[str] = set()
    for c in cands:
        c = c.strip("-_. ")
        k = norm(c)
        if len(k) < 3 or len(k) > 18:
            continue
        if k in NOISE_CODES or k.isdigit() and len(k) < 4:
            continue
        if re.match(r"^\d{10,}", k):  # hash id
            continue
        if k.startswith("DSC") or k.startswith("IMG"):
            continue
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out


def is_hash_name(stem: str) -> bool:
    if re.match(r"^\d{9,}_", stem):
        return True
    if re.match(r"^z\d{10,}_", stem, re.I):
        return True
    if len(stem) > 45 and stem.count("_") >= 2:
        return True
    return False


def load_products(conn: sqlite3.Connection) -> dict[str, list[sqlite3.Row]]:
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, code, category, image_path FROM products").fetchall()
    by: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for r in rows:
        by[norm(r["code"])].append(r)
    return by


def match_code(code: str, by_norm: dict[str, list[sqlite3.Row]]) -> list[sqlite3.Row]:
    n = norm(code)
    if n in by_norm:
        return by_norm[n]
    # soft prefix
    for kn, rows in by_norm.items():
        if abs(len(kn) - len(n)) <= 2 and (kn.startswith(n) or n.startswith(kn)):
            if len(n) >= 4:
                return rows
    return []


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS product_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          path TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'map',
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_primary INTEGER NOT NULL DEFAULT 0,
          caption TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )
        """
    )
    conn.commit()


def insert_image(
    conn: sqlite3.Connection,
    product_id: int,
    web_path: str,
    kind: str,
    caption: str,
    dry_run: bool,
) -> bool:
    exists = conn.execute(
        "SELECT id FROM product_images WHERE product_id=? AND (path=? OR caption=?)",
        (product_id, web_path, caption),
    ).fetchone()
    if exists:
        return False
    if dry_run:
        return True
    has_any = conn.execute(
        "SELECT COUNT(*) FROM product_images WHERE product_id=?", (product_id,)
    ).fetchone()[0]
    is_primary = 1 if has_any == 0 else 0
    # map prefers primary if none
    if kind == "map" and has_any > 0:
        # if no map primary yet, could still secondary
        pass
    max_sort = conn.execute(
        "SELECT COALESCE(MAX(sort_order), -1) FROM product_images WHERE product_id=?",
        (product_id,),
    ).fetchone()[0]
    if is_primary:
        conn.execute(
            "UPDATE product_images SET is_primary=0 WHERE product_id=?", (product_id,)
        )
    conn.execute(
        """
        INSERT INTO product_images (product_id, path, kind, sort_order, is_primary, caption)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (product_id, web_path, kind, max_sort + 1, is_primary, caption),
    )
    if is_primary:
        conn.execute(
            "UPDATE products SET image_path=? WHERE id=?", (web_path, product_id)
        )
    return True


def copy_for_product(
    src: Path, product_code: str, kind: str, rel: str, dry_run: bool
) -> str:
    ext = src.suffix.lower()
    if ext == ".jpeg":
        ext = ".jpg"
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", product_code)
    # stable-ish hash from path
    tag = abs(hash(rel)) % (10**10)
    if kind == "concept":
        dest_dir = OUT_CONCEPT
        web_prefix = "/products/concepts"
        name = f"{safe}_concept_{tag}{ext}"
    else:
        dest_dir = OUT_MAP
        web_prefix = "/products"
        # if simple map from code-named file, prefer clean name
        if norm(src.stem) == norm(product_code) or not is_hash_name(src.stem):
            name = f"{safe}{ext}"
            dest = dest_dir / name
            if dest.exists() and dest.stat().st_size > 0:
                return f"{web_prefix}/{name}"
        else:
            name = f"{safe}_{tag}{ext}"
    dest = dest_dir / name
    if not dry_run and not dest.exists():
        shutil.copy2(src, dest)
    return f"{web_prefix}/{name}"


def scan_index(force: bool = False) -> list[dict]:
    if INDEX_PATH.exists() and not force:
        data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        print(f"Loaded file index: {len(data)} images")
        return data

    print(f"Scanning {ROOT} …")
    t0 = time.time()
    items: list[dict] = []
    if not ROOT.exists():
        print("ERROR: path not found", ROOT)
        sys.exit(1)

    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue
        if should_skip(p):
            continue
        try:
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
        except ValueError:
            continue
        items.append(
            {
                "abs": str(p),
                "rel": rel,
                "stem": p.stem,
                "kind_guess": guess_kind(p),
            }
        )
    INDEX_PATH.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    print(f"Indexed {len(items)} images in {time.time() - t0:.1f}s → {INDEX_PATH}")
    return items


def pass_a(items: list[dict], by_norm: dict, conn: sqlite3.Connection, dry_run: bool) -> dict:
    print("\n=== PASS A: filename code + HÌNH MAP preference ===")
    matched = 0
    inserted = 0
    skipped_dup = 0
    no_code = 0
    unmatched_code = 0
    by_product: dict[int, int] = defaultdict(int)
    samples: list[dict] = []

    for i, it in enumerate(items, 1):
        stem = it["stem"]
        cands = stem_candidates(stem)
        if not cands:
            no_code += 1
            continue
        # try each candidate
        hit_rows = []
        used_code = None
        for c in cands:
            rows = match_code(c, by_norm)
            if rows:
                hit_rows = rows
                used_code = c
                break
        if not hit_rows:
            unmatched_code += 1
            continue

        matched += 1
        kind = it["kind_guess"]
        for prod in hit_rows:
            web = copy_for_product(
                Path(it["abs"]), prod["code"], kind, it["rel"], dry_run
            )
            ok = insert_image(conn, prod["id"], web, kind, it["rel"], dry_run)
            if ok:
                inserted += 1
                by_product[prod["id"]] += 1
                if len(samples) < 25:
                    samples.append(
                        {
                            "code": prod["code"],
                            "ocr_or_file": used_code,
                            "rel": it["rel"],
                            "kind": kind,
                            "web": web,
                        }
                    )
            else:
                skipped_dup += 1

        if i % 2000 == 0:
            print(f"  A progress {i}/{len(items)} matched_files={matched} inserts={inserted}")
            if not dry_run:
                conn.commit()

    if not dry_run:
        conn.commit()

    return {
        "pass": "A",
        "files": len(items),
        "files_with_code_candidates": len(items) - no_code,
        "files_matched_db": matched,
        "files_no_code_in_name": no_code,
        "files_code_not_in_db": unmatched_code,
        "rows_inserted": inserted,
        "rows_dup_skipped": skipped_dup,
        "products_touched": len(by_product),
        "samples": samples,
    }


def extract_codes_from_ocr_texts(texts: list[str]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    pat = re.compile(r"[A-Za-z]{1,8}\d{2,6}[A-Za-z0-9\-]*|\d{4,6}[A-Za-z]{0,4}")
    for t in texts:
        t2 = t.strip().replace(" ", "")
        for m in pat.finditer(t2):
            raw = m.group(0)
            k = norm(raw)
            if len(k) < 3 or k in NOISE_CODES:
                continue
            if k.startswith("SIZE") or k.endswith("MM") and len(k) <= 6:
                continue
            if k not in seen:
                seen.add(k)
                found.append(raw)
    return found


def pass_b(
    items: list[dict],
    by_norm: dict,
    conn: sqlite3.Connection,
    dry_run: bool,
    already_captioned: set[str],
) -> dict:
    print("\n=== PASS B: OCR on unmatched / hash / concept ===")
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        print("Install: pip install rapidocr-onnxruntime")
        return {"pass": "B", "error": "no rapidocr"}

    engine = RapidOCR()
    cache: dict = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        print(f"OCR cache entries: {len(cache)}")

    # candidates for OCR: not already linked as caption, hash or concept folder
    todo = []
    for it in items:
        if it["rel"] in already_captioned:
            continue
        stem = it["stem"]
        cands = stem_candidates(stem)
        has_db = any(match_code(c, by_norm) for c in cands)
        if has_db:
            continue  # A should have handled; skip
        if (
            is_hash_name(stem)
            or it["kind_guess"] == "concept"
            or "hình concept" in it["rel"].casefold()
            or not cands
        ):
            todo.append(it)

    print(f"OCR queue: {len(todo)} images")
    matched = 0
    inserted = 0
    skipped_dup = 0
    no_text = 0
    t0 = time.time()

    for i, it in enumerate(todo, 1):
        rel = it["rel"]
        if rel in cache:
            codes = cache[rel].get("codes", [])
            texts = cache[rel].get("texts", [])
        else:
            try:
                ocr_out, _ = engine(it["abs"])
            except Exception as e:
                ocr_out = None
                cache[rel] = {"texts": [], "codes": [], "err": str(e)}
                codes, texts = [], []
            else:
                texts = []
                if ocr_out:
                    for line in ocr_out:
                        if isinstance(line, (list, tuple)) and len(line) >= 2:
                            texts.append(str(line[1]))
                codes = extract_codes_from_ocr_texts(texts)
                cache[rel] = {"texts": texts, "codes": codes}

        if i % 50 == 0 or i == len(todo):
            CACHE_PATH.write_text(
                json.dumps(cache, ensure_ascii=False), encoding="utf-8"
            )
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed else 0
            eta = (len(todo) - i) / rate if rate else 0
            print(
                f"  B {i}/{len(todo)} matched={matched} ins={inserted} "
                f"{rate:.2f} img/s ETA {eta/60:.1f}m"
            )
            if not dry_run:
                conn.commit()

        if not codes:
            no_text += 1
            continue

        any_hit = False
        for code in codes:
            rows = match_code(code, by_norm)
            if not rows:
                continue
            any_hit = True
            kind = "concept" if it["kind_guess"] != "map" else it["kind_guess"]
            # prefer concept for OCR from photos
            if "map" not in it["rel"].casefold():
                kind = "concept"
            for prod in rows:
                web = copy_for_product(
                    Path(it["abs"]), prod["code"], kind, rel, dry_run
                )
                ok = insert_image(conn, prod["id"], web, kind, rel, dry_run)
                if ok:
                    inserted += 1
                else:
                    skipped_dup += 1
        if any_hit:
            matched += 1

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    if not dry_run:
        conn.commit()

    return {
        "pass": "B",
        "ocr_queue": len(todo),
        "files_matched_db": matched,
        "rows_inserted": inserted,
        "rows_dup_skipped": skipped_dup,
        "no_usable_code": no_text,
        "seconds": round(time.time() - t0, 1),
    }


def captions_in_db(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute(
        "SELECT DISTINCT caption FROM product_images WHERE caption != ''"
    ).fetchall()
    return {r[0] for r in rows}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pass", dest="which", choices=["A", "B", "all"], default="A")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--rescan", action="store_true", help="Force rebuild file index")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print("Missing DB", DB_PATH)
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    ensure_tables(conn)
    by_norm = load_products(conn)
    print(f"DB products: {len(by_norm)} unique codes")

    items = scan_index(force=args.rescan)
    report: dict = {
        "root": str(ROOT),
        "dry_run": args.dry_run,
        "started": time.strftime("%Y-%m-%d %H:%M:%S"),
        "passes": [],
    }

    if args.which in ("A", "all"):
        ra = pass_a(items, by_norm, conn, args.dry_run)
        report["passes"].append(ra)
        print(json.dumps(ra, ensure_ascii=False, indent=2))

    if args.which in ("B", "all"):
        caps = captions_in_db(conn)
        rb = pass_b(items, by_norm, conn, args.dry_run, caps)
        report["passes"].append(rb)
        print(json.dumps(rb, ensure_ascii=False, indent=2))

    # final stats
    report["final"] = {
        "product_images": conn.execute(
            "SELECT COUNT(*) FROM product_images"
        ).fetchone()[0],
        "products_with_image": conn.execute(
            "SELECT COUNT(*) FROM products WHERE image_path != ''"
        ).fetchone()[0],
    }
    report["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Report →", REPORT_PATH)
    print("Final:", report["final"])
    conn.close()


if __name__ == "__main__":
    main()
