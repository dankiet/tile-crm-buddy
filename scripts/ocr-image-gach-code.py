# -*- coding: utf-8 -*-
"""
OCR mã sản phẩm từ ảnh trong Image_Gach_Code (Gach Bong / Mosaic / The).
Match với DB products → copy ảnh concept + ghi product_images.
"""
from __future__ import annotations

import json
import re
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

from rapidocr_onnxruntime import RapidOCR

ROOT_IMG = Path(r"C:\Users\dankiet\Documents\Image_Gach_Code")
FOLDERS = {
    "Gach Bong": "Gạch bông",
    "Gach Mosaic": "Gạch mosaic",
    "Gach The": "Gạch thẻ",
}
CRM = Path(r"C:\Users\dankiet\Documents\CRM")
DB_PATH = CRM / "data" / "crm.db"
OUT_DIR = CRM / "public" / "products" / "concepts"
CACHE_PATH = CRM / "data" / "ocr_image_gach_code.json"
REPORT_PATH = CRM / "data" / "ocr_image_gach_code_report.json"

# Product code patterns seen on labels / catalogs
CODE_RE = re.compile(
    r"\b("
    r"[A-Z]{1,6}\d{2,6}[A-Z0-9\-]*"  # F2114, IN6201, BH111, M11B00, YK23200
    r"|\d{4,6}[A-Z]{0,3}"  # 20140, 23003
    r")\b",
    re.I,
)

# noise to drop
NOISE = {
    "JPEG",
    "PNG",
    "JPG",
    "IMG",
    "IMAGE",
    "OPT",
    "MAP",
    "GACH",
    "THE",
    "BONG",
    "MOSAIC",
}


def norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def extract_codes(texts: list[str]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for t in texts:
        t = t.strip().replace(" ", "")
        # full line as code if looks like one
        for m in CODE_RE.finditer(t.upper().replace("O", "0") if False else t):
            raw = m.group(1).upper().replace("—", "-").strip("-")
            # fix common OCR confusions lightly
            raw2 = raw
            key = norm(raw2)
            if len(key) < 3 or len(key) > 16:
                continue
            if key in NOISE or key.isdigit() and len(key) < 4:
                continue
            # pure year-like 2020-2030 skip? keep 20140
            if key not in seen:
                seen.add(key)
                found.append(raw2)
        # also try whole cleaned token
        tok = re.sub(r"[^A-Za-z0-9\-]", "", t)
        if tok and CODE_RE.fullmatch(tok):
            key = norm(tok)
            if key not in seen and len(key) >= 3 and key not in NOISE:
                seen.add(key)
                found.append(tok.upper())
    return found


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    engine = RapidOCR()

    # Load product codes from DB
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    products = conn.execute(
        "SELECT id, code, name, category, image_path FROM products"
    ).fetchall()
    by_norm: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for p in products:
        by_norm[norm(p["code"])].append(p)
    print(f"DB products: {len(products)} unique norms: {len(by_norm)}")

    # Cache OCR results to resume
    cache: dict = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        print(f"Loaded OCR cache: {len(cache)} entries")

    results = []
    matched_links: list[dict] = []
    unmatched_codes: dict[str, int] = defaultdict(int)
    images_with_no_code = []

    all_imgs: list[tuple[str, Path]] = []
    for folder, cat in FOLDERS.items():
        folder_path = ROOT_IMG / folder
        for p in sorted(folder_path.rglob("*")):
            if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            all_imgs.append((cat, p))

    print(f"Images to scan: {len(all_imgs)}")

    for i, (cat, path) in enumerate(all_imgs, 1):
        rel = str(path.relative_to(ROOT_IMG)).replace("\\", "/")
        key = rel
        if key in cache:
            entry = cache[key]
            texts = entry.get("texts", [])
            codes = entry.get("codes", [])
        else:
            try:
                ocr_out, _ = engine(str(path))
            except Exception as e:
                print(f"  OCR fail {rel}: {e}")
                ocr_out = None
            texts = []
            if ocr_out:
                for line in ocr_out:
                    # line: [box, text, score]
                    if isinstance(line, (list, tuple)) and len(line) >= 2:
                        texts.append(str(line[1]))
            codes = extract_codes(texts)
            cache[key] = {"texts": texts, "codes": codes, "category": cat}
            if i % 20 == 0 or i == len(all_imgs):
                CACHE_PATH.write_text(
                    json.dumps(cache, ensure_ascii=False, indent=0),
                    encoding="utf-8",
                )
                print(f"  [{i}/{len(all_imgs)}] cached… last={rel} codes={codes}")

        results.append(
            {
                "path": rel,
                "abs": str(path),
                "category": cat,
                "folder": path.parent.name,
                "texts": texts,
                "codes": codes,
            }
        )

        if not codes:
            images_with_no_code.append(rel)
            continue

        # Match to products
        hit_any = False
        for code in codes:
            n = norm(code)
            cands = by_norm.get(n, [])
            # prefix/suffix soft match
            if not cands:
                for kn, rows in by_norm.items():
                    if kn == n or (len(n) >= 4 and (kn.startswith(n) or n.startswith(kn))):
                        if abs(len(kn) - len(n)) <= 2:
                            cands = rows
                            break
            if not cands:
                unmatched_codes[code] += 1
                continue
            hit_any = True
            for prod in cands:
                matched_links.append(
                    {
                        "product_id": prod["id"],
                        "product_code": prod["code"],
                        "product_name": prod["name"],
                        "ocr_code": code,
                        "src": str(path),
                        "rel": rel,
                        "category_folder": cat,
                        "collection_hint": path.parent.name,
                    }
                )
        if not hit_any and codes:
            for code in codes:
                unmatched_codes[code] += 1

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")

    # Deduplicate links: same product_id + same src
    uniq = {}
    for m in matched_links:
        k = (m["product_id"], m["src"])
        uniq[k] = m
    matched_links = list(uniq.values())

    # Insert into DB as concept images
    cur = conn.cursor()
    cur.execute(
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

    inserted = 0
    skipped_dup = 0
    for m in matched_links:
        # destination filename
        stem = Path(m["src"]).stem
        # short hash from end of name
        short = stem.split("_")[-1][:12] if "_" in stem else stem[:12]
        safe_code = re.sub(r"[^A-Za-z0-9_-]", "_", m["product_code"])
        ext = Path(m["src"]).suffix.lower()
        if ext == ".jpeg":
            ext = ".jpg"
        dest_name = f"{safe_code}_concept_{short}{ext}"
        dest = OUT_DIR / dest_name
        if not dest.exists():
            shutil.copy2(m["src"], dest)
        web_path = f"/products/concepts/{dest_name}"

        # skip if already linked
        exists = cur.execute(
            "SELECT id FROM product_images WHERE product_id=? AND path=?",
            (m["product_id"], web_path),
        ).fetchone()
        if exists:
            skipped_dup += 1
            continue

        # also skip if same source path already stored for product via caption
        exists2 = cur.execute(
            "SELECT id FROM product_images WHERE product_id=? AND caption=?",
            (m["product_id"], m["rel"]),
        ).fetchone()
        if exists2:
            skipped_dup += 1
            continue

        max_sort = cur.execute(
            "SELECT COALESCE(MAX(sort_order), -1) FROM product_images WHERE product_id=?",
            (m["product_id"],),
        ).fetchone()[0]
        has_primary = cur.execute(
            "SELECT COUNT(*) FROM product_images WHERE product_id=? AND is_primary=1",
            (m["product_id"],),
        ).fetchone()[0]
        # concept is not primary unless product has zero images
        has_any = cur.execute(
            "SELECT COUNT(*) FROM product_images WHERE product_id=?",
            (m["product_id"],),
        ).fetchone()[0]
        is_primary = 1 if has_any == 0 else 0
        if is_primary and has_primary:
            cur.execute(
                "UPDATE product_images SET is_primary=0 WHERE product_id=?",
                (m["product_id"],),
            )

        cur.execute(
            """
            INSERT INTO product_images (product_id, path, kind, sort_order, is_primary, caption)
            VALUES (?, ?, 'concept', ?, ?, ?)
            """,
            (
                m["product_id"],
                web_path,
                max_sort + 1,
                is_primary,
                m["rel"],
            ),
        )
        if is_primary:
            cur.execute(
                "UPDATE products SET image_path=? WHERE id=?",
                (web_path, m["product_id"]),
            )
        inserted += 1

    conn.commit()

    # Stats
    products_got_new = len({m["product_id"] for m in matched_links})
    report = {
        "images_scanned": len(all_imgs),
        "images_with_codes": len(all_imgs) - len(images_with_no_code),
        "images_no_code": len(images_with_no_code),
        "matched_links": len(matched_links),
        "products_with_new_images": products_got_new,
        "inserted_rows": inserted,
        "skipped_dup": skipped_dup,
        "unmatched_codes_top": sorted(
            unmatched_codes.items(), key=lambda x: -x[1]
        )[:40],
        "sample_matches": matched_links[:30],
        "sample_no_code": images_with_no_code[:20],
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("\n=== DONE ===")
    print(json.dumps({k: report[k] for k in report if k not in ("sample_matches", "sample_no_code", "unmatched_codes_top")}, ensure_ascii=False, indent=2))
    print("unmatched top:", report["unmatched_codes_top"][:15])
    print(f"report → {REPORT_PATH}")
    conn.close()


if __name__ == "__main__":
    main()
