# -*- coding: utf-8 -*-
"""Import quy cách đóng gói (m2/thùng, viên/thùng) từ BẢNG BÁO GIÁ .xlsb vào products."""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from pyxlsb import open_workbook

CRM = Path(r"C:\Users\dankiet\Documents\CRM")
DB = CRM / "data" / "crm.db"
XLSB = Path(
    r"C:\Users\dankiet\Documents\Image_Gach_Code - Copy\BẢNG BÁO GIÁ HÀNG MÌNH - 07.2026 - Full.xlsb"
)


def norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())


def fmt_packing(m2_box, pcs_box) -> str:
    if m2_box is None and pcs_box is None:
        return ""
    try:
        m2 = float(m2_box) if m2_box is not None else None
        pcs = float(pcs_box) if pcs_box is not None else None
    except (TypeError, ValueError):
        return ""
    if pcs and m2:
        # 100 viên/1.00m2
        m2s = f"{m2:.2f}".rstrip("0").rstrip(".")
        pcs_i = int(pcs) if abs(pcs - int(pcs)) < 1e-6 else pcs
        return f"{pcs_i} viên/{m2s}m2"
    if pcs:
        pcs_i = int(pcs) if abs(pcs - int(pcs)) < 1e-6 else pcs
        return f"{pcs_i} viên/thùng"
    if m2:
        m2s = f"{m2:.2f}".rstrip("0").rstrip(".")
        return f"{m2s} m2/thùng"
    return ""


def main() -> None:
    if not XLSB.exists():
        raise SystemExit(f"Missing {XLSB}")
    conn = sqlite3.connect(str(DB))
    # migrate columns
    cols = {r[1] for r in conn.execute("PRAGMA table_info(products)")}
    for col, typ in [
        ("packing", "TEXT NOT NULL DEFAULT ''"),
        ("packing_m2", "REAL"),
        ("packing_pcs", "REAL"),
    ]:
        if col not in cols:
            try:
                conn.execute(f"ALTER TABLE products ADD COLUMN {col} {typ}")
            except sqlite3.OperationalError:
                pass
    conn.commit()

    products = {
        norm(r[0]): r[1]
        for r in conn.execute("SELECT code, id FROM products")
    }
    print("products", len(products))

    packing_by_code: dict[str, tuple] = {}

    def ingest_sheet(sheet_name: str, code_col: int, m2_col: int, pcs_col: int):
        with open_workbook(str(XLSB)) as wb:
            with wb.get_sheet(sheet_name) as sh:
                for row in sh.rows():
                    vals = [c.v for c in row]
                    if len(vals) <= max(code_col, m2_col, pcs_col):
                        continue
                    code = vals[code_col]
                    if not isinstance(code, str) or not code.strip():
                        continue
                    m2, pcs = vals[m2_col], vals[pcs_col]
                    if not isinstance(m2, (int, float)) and not isinstance(
                        pcs, (int, float)
                    ):
                        continue
                    packing_by_code[norm(code)] = (code.strip(), m2, pcs)

    # BANG BAO GIA: code=2, m2=7, pcs=8
    ingest_sheet("BANG BAO GIA", 2, 7, 8)
    # LIST GẠCH BÔNG may differ — try same layout
    try:
        ingest_sheet("LIST GẠCH BÔNG", 1, 7, 8)
    except Exception as e:
        print("skip bong sheet", e)
    try:
        # 30x60 sheet: check columns by scanning
        with open_workbook(str(XLSB)) as wb:
            with wb.get_sheet("30x60") as sh:
                for i, row in enumerate(sh.rows()):
                    vals = [c.v for c in row]
                    if i < 20 and any(vals):
                        print("30x60 row", i, [(j, v) for j, v in enumerate(vals) if v is not None][:15])
                    if i > 25:
                        break
    except Exception as e:
        print("30x60 peek", e)

    updated = 0
    for ncode, (code, m2, pcs) in packing_by_code.items():
        pid = products.get(ncode)
        if not pid:
            continue
        text = fmt_packing(m2, pcs)
        conn.execute(
            """
            UPDATE products
            SET packing = ?, packing_m2 = ?, packing_pcs = ?
            WHERE id = ?
            """,
            (text, m2 if isinstance(m2, (int, float)) else None,
             pcs if isinstance(pcs, (int, float)) else None, pid),
        )
        updated += 1

    conn.commit()
    with_pack = conn.execute(
        "SELECT COUNT(*) FROM products WHERE packing != ''"
    ).fetchone()[0]
    print(f"updated {updated}, products with packing={with_pack}")
    sample = conn.execute(
        "SELECT code, packing, packing_m2, packing_pcs FROM products WHERE packing!='' LIMIT 8"
    ).fetchall()
    print("sample", sample)
    conn.close()


if __name__ == "__main__":
    main()
