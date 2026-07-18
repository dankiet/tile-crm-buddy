import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let db: Database.Database | null = null;

function resolveDbPath() {
  // Prefer project root data/crm.db (works in Vite/Node)
  const candidates = [
    path.join(process.cwd(), "data", "crm.db"),
    path.resolve(process.cwd(), "..", "data", "crm.db"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Create empty path at default location (seed will fill it)
  return candidates[0];
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Auto-bootstrap schema if empty / missing tables
  const hasProducts = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products'",
    )
    .get();

  if (!hasProducts) {
    throw new Error(
      `Database chưa được seed. Chạy: node scripts/seed-db.mjs (db: ${dbPath})`,
    );
  }

  migrateCustomersProjectToSource(db);
  migrateProductsCollection(db);
  migrateProductImages(db);
  migrateProductColor(db);
  migrateProductPacking(db);
  migrateProductInternalCode(db);
  migrateProductStock(db);

  return db;
}

/** Tồn kho (m²) — map từ Stock.xlsx theo mã nội bộ HHDV */
function migrateProductStock(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(products)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (names.has("stock_m2")) return;
  try {
    database.exec("ALTER TABLE products ADD COLUMN stock_m2 REAL");
  } catch {
    /* ignore */
  }
}

/** Mã nội bộ HHDV (map từ Mapping_HHDV_BaoGia) */
function migrateProductInternalCode(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(products)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (names.has("internal_code")) return;
  try {
    database.exec(
      "ALTER TABLE products ADD COLUMN internal_code TEXT NOT NULL DEFAULT ''",
    );
  } catch {
    /* ignore */
  }
}

function migrateProductPacking(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(products)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  for (const [col, ddl] of [
    ["packing", "TEXT NOT NULL DEFAULT ''"],
    ["packing_m2", "REAL"],
    ["packing_pcs", "REAL"],
  ] as const) {
    if (names.has(col)) continue;
    try {
      database.exec(`ALTER TABLE products ADD COLUMN ${col} ${ddl}`);
    } catch {
      /* ignore */
    }
  }
}

/** Thêm cột color + suy ra từ tên nếu trống */
function migrateProductColor(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(products)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("color")) {
    try {
      database.exec(
        "ALTER TABLE products ADD COLUMN color TEXT NOT NULL DEFAULT ''",
      );
    } catch {
      return;
    }
  }

  const rows = database
    .prepare("SELECT id, name, color FROM products WHERE color = '' OR color IS NULL")
    .all() as Array<{ id: number; name: string; color: string }>;
  if (!rows.length) return;

  const update = database.prepare(
    "UPDATE products SET color = ? WHERE id = ?",
  );
  const tx = database.transaction(() => {
    for (const r of rows) {
      const c = inferColorFromName(r.name);
      if (c) update.run(c, r.id);
    }
  });
  tx();
}

function inferColorFromName(name: string): string {
  const n = (name || "").toLowerCase();
  // longer / specific first
  const rules: Array<[string, string[]]> = [
    ["Xanh mint", ["mint", "xanh mint"]],
    ["Xanh dương", ["xanh dương", "xanh duong", "xanh da trời", "xanh da troi", "navy"]],
    ["Xanh lá", ["xanh lá", "xanh la", "xanh rêu", "xanh reu"]],
    ["Xanh", ["xanh", "blue", "green"]],
    ["Beige", ["beige", "be "]],
    ["Trắng", ["trắng", "trang", "white"]],
    ["Đen", ["đen", "den", "black"]],
    ["Xám", ["xám", "xam", "grey", "gray"]],
    ["Kem", ["kem", "cream", "ivory"]],
    ["Nâu", ["nâu", "nau", "brown", "coffee", "gỗ", "go "]],
    ["Vàng", ["vàng", "vang", "yellow", "gold"]],
    ["Cam", ["cam ", "cam,", "orange"]],
    ["Đỏ", ["đỏ", "do ", "red", "hồng đậm"]],
    ["Hồng", ["hồng", "hong", "pink", "rose"]],
    ["Tím", ["tím", "tim", "purple", "violet"]],
    ["Gold", ["gold", "vàng gold"]],
  ];
  for (const [label, keys] of rules) {
    if (keys.some((k) => n.includes(k.trim()))) return label;
  }
  return "";
}

/** Bảng ảnh nhiều / SP + seed từ image_path cũ */
function migrateProductImages(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'map',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_product_images_product
      ON product_images(product_id);
  `);

  // One-time: copy products.image_path → product_images if product has no rows
  const missing = database
    .prepare(
      `SELECT p.id, p.image_path FROM products p
       WHERE p.image_path != ''
         AND NOT EXISTS (
           SELECT 1 FROM product_images i WHERE i.product_id = p.id
         )`,
    )
    .all() as Array<{ id: number; image_path: string }>;

  if (!missing.length) return;

  const insert = database.prepare(
    `INSERT INTO product_images (product_id, path, kind, sort_order, is_primary, caption)
     VALUES (?, ?, 'map', 0, 1, '')`,
  );
  const tx = database.transaction(
    (rows: Array<{ id: number; image_path: string }>) => {
      for (const r of rows) insert.run(r.id, r.image_path);
    },
  );
  tx(missing);
}

function migrateProductsCollection(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(products)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (names.has("collection")) return;
  try {
    database.exec(
      "ALTER TABLE products ADD COLUMN collection TEXT NOT NULL DEFAULT ''",
    );
    // fallback: use section as collection until reseed
    database.exec(
      "UPDATE products SET collection = section WHERE collection = '' AND section != ''",
    );
  } catch {
    /* already exists or unsupported */
  }
}

/** Rename customers.project → source (nguồn KH) once */
function migrateCustomersProjectToSource(database: Database.Database) {
  const cols = database
    .prepare("PRAGMA table_info(customers)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (names.has("source")) return;
  if (!names.has("project")) return;
  try {
    database.exec(
      "ALTER TABLE customers RENAME COLUMN project TO source",
    );
  } catch {
    // Older SQLite: recreate column
    database.exec(`
      ALTER TABLE customers ADD COLUMN source TEXT NOT NULL DEFAULT '';
      UPDATE customers SET source = project;
    `);
  }
}
