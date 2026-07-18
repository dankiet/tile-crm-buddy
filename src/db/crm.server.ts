import fs from "node:fs";
import path from "node:path";
import { getDb } from "./index.server";
import type {
  Customer,
  CustomerDebt,
  CustomerDebtDetail,
  CustomerStatus,
  DiscountType,
  Note,
  Order,
  OrderStatus,
  Payment,
  Product,
  ProductImageKind,
  ProductImageRow,
  Quote,
  QuoteItem,
  QuoteStatus,
} from "@/lib/types";

function nowLocal() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function pad(n: number, width = 4) {
  return String(n).padStart(width, "0");
}

function nextCode(prefix: string, table: "quotes" | "orders") {
  const db = getDb();
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const row = db
    .prepare(
      `SELECT code FROM ${table} WHERE code LIKE ? ORDER BY id DESC LIMIT 1`,
    )
    .get(like) as { code: string } | undefined;
  let seq = 1;
  if (row?.code) {
    const parts = row.code.split("-");
    const last = Number(parts[parts.length - 1]);
    if (!Number.isNaN(last)) seq = last + 1;
  }
  return `${prefix}-${year}-${pad(seq)}`;
}

// ─── Products ───────────────────────────────────────────────

export function listProducts(opts?: {
  category?: string;
  search?: string;
  limit?: number;
}): Product[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts?.category && opts.category !== "all") {
    where.push("p.category = ?");
    params.push(opts.category);
  }
  if (opts?.search?.trim()) {
    where.push(
      "(p.code LIKE ? OR p.internal_code LIKE ? OR p.name LIKE ? OR p.size LIKE ? OR p.section LIKE ?)",
    );
    const q = `%${opts.search.trim()}%`;
    params.push(q, q, q, q, q);
  }

  const sql = `
    SELECT p.*,
      COALESCE((
        SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id
      ), 0) AS image_count
    FROM products p
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.category, p.section, p.code
    ${opts?.limit ? `LIMIT ${Number(opts.limit)}` : ""}
  `;
  return db.prepare(sql).all(...params) as Product[];
}

export function listCategories(): string[] {
  const db = getDb();
  return (
    db
      .prepare(
        "SELECT DISTINCT category FROM products WHERE category != '' ORDER BY category",
      )
      .all() as { category: string }[]
  ).map((r) => r.category);
}

export function getProduct(id: number): Product | null {
  return (
    (getDb()
      .prepare(
        `SELECT p.*,
          COALESCE((
            SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id
          ), 0) AS image_count
         FROM products p WHERE p.id = ?`,
      )
      .get(id) as Product | undefined) ?? null
  );
}

export function listSections(category?: string): string[] {
  const db = getDb();
  if (category && category !== "all") {
    return (
      db
        .prepare(
          `SELECT DISTINCT section FROM products
           WHERE category = ? AND section != ''
           ORDER BY section`,
        )
        .all(category) as { section: string }[]
    ).map((r) => r.section);
  }
  return (
    db
      .prepare(
        `SELECT DISTINCT section FROM products WHERE section != '' ORDER BY section`,
      )
      .all() as { section: string }[]
  ).map((r) => r.section);
}

export type ProductUpdate = {
  code?: string;
  internal_code?: string;
  name?: string;
  size?: string;
  material?: string;
  category?: string;
  section?: string;
  collection?: string;
  color?: string;
  stock_m2?: number | null;
  retail_price?: number;
  discount_tp?: number | null;
  discount_b2b?: number | null;
  note?: string;
  is_hot?: number;
  image_path?: string;
};

export function updateProduct(id: number, input: ProductUpdate): Product {
  const existing = getProduct(id);
  if (!existing) throw new Error("Không tìm thấy sản phẩm");

  const code = (input.code ?? existing.code).trim();
  if (!code) throw new Error("Mã sản phẩm bắt buộc");

  if (code !== existing.code) {
    const clash = getDb()
      .prepare("SELECT id FROM products WHERE code = ? AND id != ?")
      .get(code, id);
    if (clash) throw new Error(`Mã ${code} đã tồn tại`);
  }

  const retail =
    input.retail_price != null
      ? Math.round(Number(input.retail_price))
      : existing.retail_price;
  if (!retail || retail < 0) throw new Error("Giá bán lẻ không hợp lệ");

  let stockM2: number | null;
  if (input.stock_m2 !== undefined) {
    if (input.stock_m2 == null) {
      stockM2 = null;
    } else {
      stockM2 = Number(input.stock_m2);
      if (Number.isNaN(stockM2) || stockM2 < 0) {
        throw new Error("Tồn kho (m²) không hợp lệ");
      }
    }
  } else {
    stockM2 = existing.stock_m2 ?? null;
  }

  getDb()
    .prepare(
      `UPDATE products SET
        code = @code,
        internal_code = @internal_code,
        name = @name,
        size = @size,
        material = @material,
        category = @category,
        section = @section,
        collection = @collection,
        color = @color,
        stock_m2 = @stock_m2,
        retail_price = @retail_price,
        discount_tp = @discount_tp,
        discount_b2b = @discount_b2b,
        note = @note,
        is_hot = @is_hot,
        image_path = @image_path
       WHERE id = @id`,
    )
    .run({
      id,
      code,
      internal_code: (
        input.internal_code !== undefined
          ? input.internal_code
          : (existing.internal_code ?? "")
      ).trim(),
      name: (input.name ?? existing.name).trim() || code,
      size: (input.size ?? existing.size).trim(),
      material: (input.material ?? existing.material).trim(),
      category: (input.category ?? existing.category).trim(),
      section: (input.section ?? existing.section).trim(),
      collection: (input.collection ?? existing.collection ?? "").trim(),
      color: (input.color ?? existing.color ?? "").trim(),
      stock_m2: stockM2,
      retail_price: retail,
      discount_tp:
        input.discount_tp !== undefined
          ? input.discount_tp
          : existing.discount_tp,
      discount_b2b:
        input.discount_b2b !== undefined
          ? input.discount_b2b
          : existing.discount_b2b,
      note: (input.note ?? existing.note).trim(),
      is_hot:
        input.is_hot !== undefined
          ? input.is_hot
            ? 1
            : 0
          : existing.is_hot,
      image_path: (input.image_path ?? existing.image_path).trim(),
    });

  return getProduct(id)!;
}

export function priceAfterDiscount(
  retail: number,
  discountPct: number | null | undefined,
): number {
  const pct = discountPct ?? 0;
  return Math.round(retail * (1 - pct / 100));
}

// ─── Product images (nhiều ảnh / SP) ─────────────────────────

function syncPrimaryImagePath(productId: number) {
  const db = getDb();
  const primary = db
    .prepare(
      `SELECT path FROM product_images
       WHERE product_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC
       LIMIT 1`,
    )
    .get(productId) as { path: string } | undefined;
  db.prepare("UPDATE products SET image_path = ? WHERE id = ?").run(
    primary?.path ?? "",
    productId,
  );
}

export function listProductImages(productId: number): ProductImageRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM product_images
       WHERE product_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    )
    .all(productId) as ProductImageRow[];
}

export function addProductImage(input: {
  product_id: number;
  path: string;
  kind?: ProductImageKind;
  caption?: string;
  is_primary?: boolean;
}): ProductImageRow {
  const db = getDb();
  if (!getProduct(input.product_id)) {
    throw new Error("Không tìm thấy sản phẩm");
  }
  const pathStr = input.path.trim();
  if (!pathStr) throw new Error("Đường dẫn ảnh bắt buộc");

  const count = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?",
      )
      .get(input.product_id) as { n: number }
  ).n;

  const makePrimary = input.is_primary === true || count === 0;
  if (makePrimary) {
    db.prepare(
      "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
    ).run(input.product_id);
  }

  const maxSort = (
    db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?",
      )
      .get(input.product_id) as { m: number }
  ).m;

  const info = db
    .prepare(
      `INSERT INTO product_images
        (product_id, path, kind, sort_order, is_primary, caption)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.product_id,
      pathStr,
      input.kind ?? "other",
      maxSort + 1,
      makePrimary ? 1 : 0,
      (input.caption ?? "").trim(),
    );

  syncPrimaryImagePath(input.product_id);
  return db
    .prepare("SELECT * FROM product_images WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as ProductImageRow;
}

/** Lưu file upload (base64 data URL) vào public/products/uploads */
export function uploadProductImageFile(input: {
  product_id: number;
  filename: string;
  dataBase64: string;
  mimeType?: string;
  kind?: ProductImageKind;
  caption?: string;
  is_primary?: boolean;
}): ProductImageRow {
  if (!getProduct(input.product_id)) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  let b64 = input.dataBase64;
  const dataUrlMatch = b64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    b64 = dataUrlMatch[2]!;
  }
  const buf = Buffer.from(b64, "base64");
  if (buf.length > 12 * 1024 * 1024) {
    throw new Error("Ảnh quá lớn (tối đa 12MB)");
  }

  const mime = input.mimeType || dataUrlMatch?.[1] || "image/jpeg";
  const extFromMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  let ext = extFromMime[mime] || path.extname(input.filename).toLowerCase();
  if (!ext || ext === ".") ext = ".jpg";

  const product = getProduct(input.product_id)!;
  const safeCode = product.code.replace(/[^A-Za-z0-9_-]/g, "_");
  const stamp = Date.now().toString(36);
  const fileName = `${safeCode}_${stamp}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "products", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, fileName), buf);

  const publicPath = `/products/uploads/${fileName}`;
  return addProductImage({
    product_id: input.product_id,
    path: publicPath,
    kind: input.kind ?? "concept",
    caption: input.caption,
    is_primary: input.is_primary,
  });
}

export function updateProductImage(
  id: number,
  input: {
    kind?: ProductImageKind;
    caption?: string;
    sort_order?: number;
  },
): ProductImageRow {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM product_images WHERE id = ?")
    .get(id) as ProductImageRow | undefined;
  if (!row) throw new Error("Không tìm thấy ảnh");

  db.prepare(
    `UPDATE product_images SET
      kind = ?, caption = ?, sort_order = ?
     WHERE id = ?`,
  ).run(
    input.kind ?? row.kind,
    input.caption !== undefined ? input.caption.trim() : row.caption,
    input.sort_order ?? row.sort_order,
    id,
  );

  return db
    .prepare("SELECT * FROM product_images WHERE id = ?")
    .get(id) as ProductImageRow;
}

export function setPrimaryProductImage(
  productId: number,
  imageId: number,
): ProductImageRow[] {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM product_images WHERE id = ? AND product_id = ?",
    )
    .get(imageId, productId) as ProductImageRow | undefined;
  if (!row) throw new Error("Không tìm thấy ảnh của sản phẩm này");

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE product_images SET is_primary = 0 WHERE product_id = ?",
    ).run(productId);
    db.prepare(
      "UPDATE product_images SET is_primary = 1 WHERE id = ?",
    ).run(imageId);
  });
  tx();
  syncPrimaryImagePath(productId);
  return listProductImages(productId);
}

export function deleteProductImage(imageId: number): {
  product_id: number;
  images: ProductImageRow[];
} {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM product_images WHERE id = ?")
    .get(imageId) as ProductImageRow | undefined;
  if (!row) throw new Error("Không tìm thấy ảnh");

  db.prepare("DELETE FROM product_images WHERE id = ?").run(imageId);

  // If deleted primary, promote first remaining
  if (row.is_primary) {
    const next = db
      .prepare(
        `SELECT id FROM product_images
         WHERE product_id = ?
         ORDER BY sort_order ASC, id ASC LIMIT 1`,
      )
      .get(row.product_id) as { id: number } | undefined;
    if (next) {
      db.prepare(
        "UPDATE product_images SET is_primary = 1 WHERE id = ?",
      ).run(next.id);
    }
  }

  // Optionally remove uploaded file only under uploads/
  if (row.path.startsWith("/products/uploads/")) {
    const filePath = path.join(process.cwd(), "public", row.path);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  syncPrimaryImagePath(row.product_id);
  return {
    product_id: row.product_id,
    images: listProductImages(row.product_id),
  };
}

// ─── Customers ──────────────────────────────────────────────

export function listCustomers(status?: CustomerStatus | "all"): Customer[] {
  const db = getDb();
  if (!status || status === "all") {
    return db
      .prepare("SELECT * FROM customers ORDER BY updated_at DESC")
      .all() as Customer[];
  }
  return db
    .prepare(
      "SELECT * FROM customers WHERE status = ? ORDER BY updated_at DESC",
    )
    .all(status) as Customer[];
}

export function getCustomer(id: number): Customer | null {
  return (
    (getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id) as
      | Customer
      | undefined) ?? null
  );
}

export function createCustomer(input: {
  name: string;
  source?: string;
  phone?: string;
  region?: string;
  status?: CustomerStatus;
  note?: string;
}): Customer {
  const db = getDb();
  const ts = nowLocal();
  const info = db
    .prepare(
      `INSERT INTO customers (name, source, phone, region, status, note, created_at, updated_at)
       VALUES (@name, @source, @phone, @region, @status, @note, @ts, @ts)`,
    )
    .run({
      name: input.name.trim(),
      source: (input.source ?? "").trim(),
      phone: (input.phone ?? "").trim(),
      region: (input.region ?? "").trim(),
      status: input.status ?? "consulting",
      note: (input.note ?? "").trim(),
      ts,
    });
  return getCustomer(Number(info.lastInsertRowid))!;
}

export function updateCustomerStatus(id: number, status: CustomerStatus) {
  getDb()
    .prepare(
      "UPDATE customers SET status = ?, updated_at = ? WHERE id = ?",
    )
    .run(status, nowLocal(), id);
  return getCustomer(id);
}

export function updateCustomer(
  id: number,
  input: {
    name?: string;
    source?: string;
    phone?: string;
    region?: string;
    status?: CustomerStatus;
    note?: string;
  },
): Customer {
  const existing = getCustomer(id);
  if (!existing) throw new Error("Không tìm thấy khách hàng");
  const name = (input.name ?? existing.name).trim();
  if (!name) throw new Error("Tên khách hàng bắt buộc");

  getDb()
    .prepare(
      `UPDATE customers SET
        name = ?, source = ?, phone = ?, region = ?,
        status = ?, note = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      (input.source ?? existing.source).trim(),
      (input.phone ?? existing.phone).trim(),
      (input.region ?? existing.region).trim(),
      input.status ?? existing.status,
      (input.note ?? existing.note).trim(),
      nowLocal(),
      id,
    );
  return getCustomer(id)!;
}

// ─── Quotes ─────────────────────────────────────────────────

export function listQuotes(): Quote[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT q.*,
        c.name AS customer_name,
        c.source AS customer_source,
        COALESCE((SELECT SUM(line_total) FROM quote_items qi WHERE qi.quote_id = q.id), 0) AS amount,
        COALESCE((SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id), 0) AS items_count
       FROM quotes q
       JOIN customers c ON c.id = q.customer_id
       ORDER BY q.created_at DESC`,
    )
    .all() as Quote[];
}

export function getQuoteItems(quoteId: number): QuoteItem[] {
  return getDb()
    .prepare("SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id")
    .all(quoteId) as QuoteItem[];
}

export function createQuote(input: {
  customer_id: number;
  discount_type?: DiscountType;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity_m2: number;
    discount_pct?: number;
    area?: string;
  }>;
}): Quote {
  const db = getDb();
  const customer = getCustomer(input.customer_id);
  if (!customer) throw new Error("Không tìm thấy khách hàng");
  if (!input.items?.length) throw new Error("Báo giá cần ít nhất 1 sản phẩm");

  const code = nextCode("BG", "quotes");
  const ts = nowLocal();
  const discountType = input.discount_type ?? "none";

  const createTx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO quotes (code, customer_id, status, notes, discount_type, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, ?, ?, ?)`,
      )
      .run(code, input.customer_id, input.notes ?? "", discountType, ts, ts);

    const quoteId = Number(info.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO quote_items (
        quote_id, product_id, product_code, product_name, size,
        quantity_m2, retail_price, discount_pct, unit_price, area, line_total
      ) VALUES (
        @quote_id, @product_id, @product_code, @product_name, @size,
        @quantity_m2, @retail_price, @discount_pct, @unit_price, @area, @line_total
      )`,
    );

    for (const item of input.items) {
      const product = getProduct(item.product_id);
      if (!product) throw new Error(`Sản phẩm #${item.product_id} không tồn tại`);

      let discountPct = item.discount_pct;
      if (discountPct == null) {
        if (discountType === "tp") discountPct = product.discount_tp ?? 0;
        else if (discountType === "b2b") discountPct = product.discount_b2b ?? 0;
        else discountPct = 0;
      }

      const unit = priceAfterDiscount(product.retail_price, discountPct);
      const qty = Number(item.quantity_m2) || 0;
      const lineTotal = Math.round(unit * qty);

      insertItem.run({
        quote_id: quoteId,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        size: product.size,
        quantity_m2: qty,
        retail_price: product.retail_price,
        discount_pct: discountPct,
        unit_price: unit,
        area: item.area ?? "",
        line_total: lineTotal,
      });
    }

    // Auto-update customer status when quoted
    if (customer.status === "consulting") {
      db.prepare(
        "UPDATE customers SET status = 'quoted', updated_at = ? WHERE id = ?",
      ).run(ts, input.customer_id);
    }

    return quoteId;
  });

  const quoteId = createTx() as number;
  const quote = listQuotes().find((q) => q.id === quoteId);
  if (!quote) throw new Error("Không tạo được báo giá");
  return quote;
}

export function updateQuoteStatus(id: number, status: QuoteStatus) {
  getDb()
    .prepare("UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, nowLocal(), id);
}

export function getQuote(id: number): Quote | null {
  return (
    (listQuotes().find((q) => q.id === id) as Quote | undefined) ?? null
  );
}

export function updateQuote(input: {
  id: number;
  customer_id: number;
  status?: QuoteStatus;
  discount_type?: DiscountType;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity_m2: number;
    discount_pct?: number;
    area?: string;
  }>;
}): Quote {
  const db = getDb();
  const existing = getQuote(input.id);
  if (!existing) throw new Error("Không tìm thấy báo giá");
  if (existing.status === "accepted") {
    throw new Error("Báo giá đã duyệt — không thể sửa (đã tạo đơn)");
  }
  if (!getCustomer(input.customer_id)) {
    throw new Error("Không tìm thấy khách hàng");
  }
  if (!input.items?.length) throw new Error("Báo giá cần ít nhất 1 sản phẩm");

  const discountType = input.discount_type ?? existing.discount_type;
  const status = input.status ?? existing.status;
  const ts = nowLocal();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE quotes SET customer_id = ?, status = ?, notes = ?,
        discount_type = ?, updated_at = ? WHERE id = ?`,
    ).run(
      input.customer_id,
      status,
      input.notes ?? existing.notes,
      discountType,
      ts,
      input.id,
    );

    db.prepare("DELETE FROM quote_items WHERE quote_id = ?").run(input.id);

    const insertItem = db.prepare(
      `INSERT INTO quote_items (
        quote_id, product_id, product_code, product_name, size,
        quantity_m2, retail_price, discount_pct, unit_price, area, line_total
      ) VALUES (
        @quote_id, @product_id, @product_code, @product_name, @size,
        @quantity_m2, @retail_price, @discount_pct, @unit_price, @area, @line_total
      )`,
    );

    for (const item of input.items) {
      const product = getProduct(item.product_id);
      if (!product) {
        throw new Error(`Sản phẩm #${item.product_id} không tồn tại`);
      }

      let discountPct = item.discount_pct;
      if (discountPct == null) {
        if (discountType === "tp") discountPct = product.discount_tp ?? 0;
        else if (discountType === "b2b") discountPct = product.discount_b2b ?? 0;
        else discountPct = 0;
      }

      const unit = priceAfterDiscount(product.retail_price, discountPct);
      const qty = Number(item.quantity_m2) || 0;
      const lineTotal = Math.round(unit * qty);

      insertItem.run({
        quote_id: input.id,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        size: product.size,
        quantity_m2: qty,
        retail_price: product.retail_price,
        discount_pct: discountPct,
        unit_price: unit,
        area: item.area ?? "",
        line_total: lineTotal,
      });
    }
  });

  tx();
  const quote = getQuote(input.id);
  if (!quote) throw new Error("Không cập nhật được báo giá");
  return quote;
}

// ─── Orders ─────────────────────────────────────────────────

export function listOrders(): Order[] {
  return getDb()
    .prepare(
      `SELECT o.*,
        c.name AS customer_name,
        c.source AS customer_source,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS paid_amount
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC`,
    )
    .all() as Order[];
}

export function createOrder(input: {
  customer_id: number;
  amount: number;
  quote_id?: number | null;
  status?: OrderStatus;
  notes?: string;
}): Order {
  const db = getDb();
  if (!getCustomer(input.customer_id)) {
    throw new Error("Không tìm thấy khách hàng");
  }
  const code = nextCode("DH", "orders");
  const ts = nowLocal();
  const info = db
    .prepare(
      `INSERT INTO orders (code, customer_id, quote_id, amount, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      code,
      input.customer_id,
      input.quote_id ?? null,
      Math.round(input.amount),
      input.status ?? "preparing",
      input.notes ?? "",
      ts,
      ts,
    );

  db.prepare(
    "UPDATE customers SET status = CASE WHEN status IN ('consulting','quoted') THEN 'closed' ELSE status END, updated_at = ? WHERE id = ?",
  ).run(ts, input.customer_id);

  return listOrders().find((o) => o.id === Number(info.lastInsertRowid))!;
}

export function createOrderFromQuote(quoteId: number): Order {
  const db = getDb();
  const quote = listQuotes().find((q) => q.id === quoteId);
  if (!quote) throw new Error("Không tìm thấy báo giá");
  const amount = quote.amount ?? 0;
  const order = createOrder({
    customer_id: quote.customer_id,
    quote_id: quoteId,
    amount,
    notes: `Từ báo giá ${quote.code}`,
  });
  db.prepare(
    "UPDATE quotes SET status = 'accepted', updated_at = ? WHERE id = ?",
  ).run(nowLocal(), quoteId);
  return order;
}

// ─── Payments & Debt ────────────────────────────────────────

export function listPayments(customerId?: number): Payment[] {
  const db = getDb();
  if (customerId) {
    return db
      .prepare(
        "SELECT * FROM payments WHERE customer_id = ? ORDER BY paid_at DESC",
      )
      .all(customerId) as Payment[];
  }
  return db
    .prepare("SELECT * FROM payments ORDER BY paid_at DESC")
    .all() as Payment[];
}

export function addPayment(input: {
  customer_id: number;
  amount: number;
  order_id?: number | null;
  paid_at?: string;
  note?: string;
}): Payment {
  if (!getCustomer(input.customer_id)) {
    throw new Error("Không tìm thấy khách hàng");
  }
  if (!input.amount || input.amount <= 0) {
    throw new Error("Số tiền thanh toán phải > 0");
  }
  const info = getDb()
    .prepare(
      `INSERT INTO payments (customer_id, order_id, amount, paid_at, note)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.customer_id,
      input.order_id ?? null,
      Math.round(input.amount),
      input.paid_at ?? nowLocal(),
      input.note ?? "",
    );
  return getDb()
    .prepare("SELECT * FROM payments WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as Payment;
}

export function listCustomerDebts(): CustomerDebt[] {
  return getDb()
    .prepare(
      `SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.source,
        c.phone,
        c.region,
        c.status,
        COALESCE(o.order_count, 0) AS order_count,
        COALESCE(o.total_order_amount, 0) AS total_order_amount,
        COALESCE(p.total_paid, 0) AS total_paid,
        COALESCE(o.total_order_amount, 0) - COALESCE(p.total_paid, 0) AS debt
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
          COUNT(*) AS order_count,
          SUM(amount) AS total_order_amount
        FROM orders
        GROUP BY customer_id
      ) o ON o.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS total_paid
        FROM payments
        GROUP BY customer_id
      ) p ON p.customer_id = c.id
      WHERE COALESCE(o.order_count, 0) > 0 OR COALESCE(p.total_paid, 0) > 0
      ORDER BY debt DESC, c.name ASC`,
    )
    .all() as CustomerDebt[];
}

export function getCustomerDebtDetail(
  customerId: number,
): CustomerDebtDetail | null {
  const debts = listCustomerDebts();
  const base = debts.find((d) => d.customer_id === customerId);
  const customer = getCustomer(customerId);
  if (!customer) return null;

  const summary: CustomerDebt = base ?? {
    customer_id: customer.id,
    customer_name: customer.name,
    source: customer.source,
    phone: customer.phone,
    region: customer.region,
    status: customer.status,
    order_count: 0,
    total_order_amount: 0,
    total_paid: 0,
    debt: 0,
  };

  const orders = getDb()
    .prepare(
      `SELECT o.*,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS paid_amount
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
    )
    .all(customerId) as Array<Order & { paid_amount: number }>;

  const payments = listPayments(customerId);

  return { ...summary, orders, payments };
}

// ─── Notes ──────────────────────────────────────────────────

export function listNotes(limit = 50): Note[] {
  return getDb()
    .prepare(
      `SELECT n.*, c.name AS customer_name, c.source AS customer_source
       FROM notes n
       LEFT JOIN customers c ON c.id = n.customer_id
       ORDER BY n.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Note[];
}

export function createNote(input: {
  content: string;
  customer_id?: number | null;
  author?: string;
}): Note {
  const info = getDb()
    .prepare(
      `INSERT INTO notes (customer_id, author, content) VALUES (?, ?, ?)`,
    )
    .run(
      input.customer_id ?? null,
      input.author ?? "Thế Kiệt",
      input.content.trim(),
    );
  return getDb()
    .prepare(
      `SELECT n.*, c.name AS customer_name, c.source AS customer_source
       FROM notes n LEFT JOIN customers c ON c.id = n.customer_id
       WHERE n.id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as Note;
}

// ─── Dashboard ──────────────────────────────────────────────

export function getDashboardStats() {
  const customers = listCustomers();
  const debts = listCustomerDebts();
  const orders = listOrders();
  const quotes = listQuotes();
  const notes = listNotes(10);

  const totalDebt = debts.reduce((s, d) => s + Math.max(0, d.debt), 0);
  const totalPaid = debts.reduce((s, d) => s + d.total_paid, 0);
  const totalOrderAmount = debts.reduce((s, d) => s + d.total_order_amount, 0);
  const pendingOrders = orders.filter((o) => o.status !== "delivered").length;
  const quotePipeline = quotes
    .filter((q) => q.status === "draft" || q.status === "sent")
    .reduce((s, q) => s + (q.amount ?? 0), 0);

  return {
    customerCount: customers.length,
    totalDebt,
    totalPaid,
    totalOrderAmount,
    pendingOrders,
    quotePipeline,
    notes,
    customers,
    debts,
    orders,
    quotes,
  };
}
