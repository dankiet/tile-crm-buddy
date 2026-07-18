import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./index.server";

export type QuoteExportResult = {
  filename: string;
  base64: string;
  mimeType: string;
};

/**
 * Xuất báo giá PDF A4 (form Bao_Gia_Form_V2) — fallback Excel nếu PDF fail.
 */
export function exportQuoteToPdf(quoteId: number): QuoteExportResult {
  const db = getDb();
  const quote = db
    .prepare("SELECT code FROM quotes WHERE id = ?")
    .get(quoteId) as { code: string } | undefined;
  if (!quote) throw new Error("Không tìm thấy báo giá");

  const root = process.cwd();
  const script = path.join(root, "scripts", "export-quote-xlsx.py");
  const template = path.join(root, "templates", "Bao_Gia_Form_V2.xlsx");
  if (!fs.existsSync(script)) {
    throw new Error(`Thiếu script export: ${script}`);
  }
  if (!fs.existsSync(template)) {
    throw new Error("Thiếu templates/Bao_Gia_Form_V2.xlsx");
  }

  const exportsDir = path.join(root, "data", "exports");
  fs.mkdirSync(exportsDir, { recursive: true });
  const safeCode = quote.code.replace(/[^\w\-]+/g, "_");
  const pdfPath = path.join(exportsDir, `${safeCode}.pdf`);
  const xlsxPath = path.join(exportsDir, `${safeCode}.xlsx`);

  const py = spawnSync(
    "python",
    [
      script,
      "--quote-id",
      String(quoteId),
      "--out",
      pdfPath,
      "--pdf-only",
    ],
    {
      encoding: "utf-8",
      cwd: root,
      timeout: 120_000,
      windowsHide: true,
    },
  );

  // Prefer PDF
  if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
    const buf = fs.readFileSync(pdfPath);
    return {
      filename: `${safeCode}.pdf`,
      base64: buf.toString("base64"),
      mimeType: "application/pdf",
    };
  }

  // Fallback Excel if PDF conversion failed but xlsx exists
  if (fs.existsSync(xlsxPath)) {
    const buf = fs.readFileSync(xlsxPath);
    const err = (py.stderr || py.stdout || "").toString().trim();
    console.warn("PDF export failed, returning Excel:", err);
    return {
      filename: `${safeCode}.xlsx`,
      base64: buf.toString("base64"),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  const err = (py.stderr || py.stdout || "export failed").toString().trim();
  throw new Error(err || "Không xuất được báo giá PDF");
}

/** @deprecated use exportQuoteToPdf */
export function exportQuoteToXlsx(quoteId: number): QuoteExportResult {
  return exportQuoteToPdf(quoteId);
}
