import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProductImage } from "@/components/ProductImage";
import { EditProductDialog } from "@/components/EditProductDialog";
import { EditProductImagesDialog } from "@/components/EditProductImagesDialog";
import { fetchProducts } from "@/api/functions";
import type { Product } from "@/lib/types";
import { formatVND } from "@/lib/format";
import {
  categoryFromSlug,
  labelFromCategory,
  PRODUCT_GROUPS,
} from "@/lib/product-categories";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Pencil,
  Search,
} from "lucide-react";

const PAGE_SIZE = 24;

function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function formatMoneyShort(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

type SanPhamSearch = { nhom?: string };

export const Route = createFileRoute("/_app/san-pham")({
  validateSearch: (search: Record<string, unknown>): SanPhamSearch => ({
    nhom: typeof search.nhom === "string" ? search.nhom : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (!search.nhom) {
      throw redirect({
        to: "/san-pham",
        search: { nhom: PRODUCT_GROUPS[0].slug },
      });
    }
    const cat = categoryFromSlug(search.nhom);
    if (cat === "all") {
      throw redirect({
        to: "/san-pham",
        search: { nhom: PRODUCT_GROUPS[0].slug },
      });
    }
  },
  head: ({ match }) => {
    const cat = categoryFromSlug(match.search.nhom);
    const label = cat === "all" ? "Sản phẩm" : labelFromCategory(cat);
    return {
      meta: [{ title: `${label} — Innomat CRM` }],
    };
  },
  loader: async () => {
    const products = await fetchProducts({ data: {} });
    return { products };
  },
  component: ProductsPage,
});

function ProductsPage() {
  const { products } = Route.useLoaderData() as { products: Product[] };
  const { nhom } = Route.useSearch();
  const category = categoryFromSlug(nhom);
  const groupLabel =
    category === "all" ? "Sản phẩm" : labelFromCategory(category);

  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [color, setColor] = useState<string>("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imagesProduct, setImagesProduct] = useState<Product | null>(null);

  /** Scope theo nhóm sidebar */
  const scoped = useMemo(() => {
    if (category === "all") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const colorOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of scoped) {
      const c = (p.color || "").trim();
      if (!c) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "vi"),
    );
  }, [scoped]);

  const hotInScope = useMemo(
    () => scoped.filter((p) => p.is_hot).length,
    [scoped],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = parseMoneyInput(priceMin);
    const max = parseMoneyInput(priceMax);
    return scoped.filter((p) => {
      if (min != null && p.retail_price < min) return false;
      if (max != null && p.retail_price > max) return false;
      if (color !== "all") {
        const pc = (p.color || "").trim();
        if (pc !== color) return false;
      }
      if (hotOnly && !p.is_hot) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        (p.internal_code || "").toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q) ||
        (p.color || "").toLowerCase().includes(q) ||
        (p.collection || "").toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q)
      );
    });
  }, [scoped, priceMin, priceMax, color, hotOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset filter phụ khi đổi nhóm sidebar
  useEffect(() => {
    setPage(1);
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    setColor("all");
    setHotOnly(false);
  }, [nhom]);

  useEffect(() => {
    setPage(1);
  }, [priceMin, priceMax, color, hotOnly, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const withImg = scoped.filter((p) => p.image_path).length;
  const hotTotal = scoped.filter((p) => p.is_hot).length;

  const minN = parseMoneyInput(priceMin);
  const maxN = parseMoneyInput(priceMax);
  const hasActiveFilter =
    Boolean(search.trim()) ||
    minN != null ||
    maxN != null ||
    color !== "all" ||
    hotOnly;

  const activeFilterLabels = useMemo(() => {
    const tags: string[] = [];
    if (search.trim()) tags.push(`“${search.trim()}”`);
    if (minN != null || maxN != null) {
      const a = minN != null ? formatMoneyShort(minN) : "…";
      const b = maxN != null ? formatMoneyShort(maxN) : "…";
      tags.push(`Giá ${a}–${b}`);
    }
    if (color !== "all") tags.push(color);
    if (hotOnly) tags.push("Bán chạy");
    return tags;
  }, [search, minN, maxN, color, hotOnly]);

  function clearFilters() {
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    setColor("all");
    setHotOnly(false);
  }

  const fieldCls =
    "h-9 text-sm px-3 rounded-lg bg-transparent border border-border/80 outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/15 text-foreground placeholder:text-muted-foreground/60 transition-shadow";

  return (
    <>
      <PageHeader
        title={groupLabel}
        description={`${scoped.length} mã · ${withImg} ảnh · ${hotTotal} bán chạy`}
      />

      {/* Filter trong danh mục (nhóm chọn từ sidebar) */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã, tên, kích thước, màu…"
              className={`${fieldCls} w-full pl-10`}
            />
          </div>
          <button
            type="button"
            onClick={() => setHotOnly((v) => !v)}
            className={
              hotOnly
                ? "h-9 shrink-0 px-3.5 rounded-full text-sm font-medium bg-terracotta text-primary-foreground shadow-sm"
                : "h-9 shrink-0 px-3.5 rounded-full text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-surface-strong/60 transition-colors"
            }
          >
            Bán chạy
            <span className={hotOnly ? "opacity-80 ml-1" : "ml-1 opacity-70"}>
              {hotInScope}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Giá lẻ
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Từ"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className={`${fieldCls} w-[7.25rem]`}
            />
            <span className="text-muted-foreground/50 text-sm">→</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Đến"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className={`${fieldCls} w-[7.25rem]`}
            />
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Màu</span>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={`${fieldCls} min-w-[8.5rem] appearance-none pr-8 bg-[length:12px] bg-[right_0.65rem_center] bg-no-repeat`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              <option value="all">Tất cả</option>
              {colorOptions.map(([c, n]) => (
                <option key={c} value={c}>
                  {c} · {n}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-terracotta transition-colors ml-auto"
            >
              Xóa lọc
              {activeFilterLabels.length > 0
                ? ` (${activeFilterLabels.length})`
                : ""}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0 ? (
            "Không có sản phẩm"
          ) : (
            <>
              <span className="text-foreground font-medium">
                {filtered.length}
              </span>
              <span className="mx-1">sản phẩm</span>
              {totalPages > 1 && (
                <span className="text-muted-foreground/80">
                  · trang {page}/{totalPages}
                </span>
              )}
            </>
          )}
        </p>
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {pageItems.map((t) => {
          return (
            <article
              key={t.id}
              className="group flex flex-col rounded-2xl bg-card border border-border/60 overflow-hidden transition-all duration-200 hover:border-border hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="relative aspect-[4/5] bg-[#f7f6f4] overflow-hidden">
                <ProductImage
                  src={t.image_path}
                  alt={t.name}
                  code={t.code}
                  fit="contain"
                />
                {t.is_hot ? (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold tracking-wide uppercase bg-terracotta text-primary-foreground px-2 py-0.5 rounded-full">
                    Hot
                  </span>
                ) : null}
                {(t.image_count ?? 0) > 1 ? (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-medium tabular-nums bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md">
                    {t.image_count}
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-2.5 flex justify-end gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-gradient-to-t from-black/25 to-transparent pt-8">
                  <button
                    type="button"
                    onClick={() => setImagesProduct(t)}
                    className="size-8 grid place-items-center rounded-full bg-white/95 text-foreground shadow-sm hover:bg-white"
                    title="Hình"
                  >
                    <Images className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditProduct(t)}
                    className="size-8 grid place-items-center rounded-full bg-white/95 text-foreground shadow-sm hover:bg-white"
                    title="Sửa"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col flex-1 p-3.5 pt-3">
                <p className="font-mono text-[10px] tracking-wide text-muted-foreground/80">
                  {t.code}
                  {t.internal_code
                    ? ` · NB: ${t.internal_code}`
                    : " · NB: —"}
                </p>
                <h3 className="text-[13px] font-medium leading-snug text-foreground mt-0.5 line-clamp-2 min-h-[2.4em]">
                  {t.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {[t.size, t.color].filter(Boolean).join(" · ")}
                </p>
                {t.stock_m2 != null && t.stock_m2 !== undefined ? (
                  <p
                    className={
                      t.stock_m2 > 0
                        ? "text-[11px] font-medium tabular-nums text-emerald-700 mt-1"
                        : "text-[11px] font-medium tabular-nums text-muted-foreground mt-1"
                    }
                  >
                    Tồn:{" "}
                    {Number(t.stock_m2).toLocaleString("vi-VN", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    m²
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Tồn: —
                  </p>
                )}
                <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                      {formatVND(t.retail_price)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/m² lẻ</p>
                  </div>
                  {t.discount_tp != null && (
                    <p className="text-[10px] text-muted-foreground text-right leading-tight">
                      CK TP
                      <br />
                      <span className="text-foreground font-medium">
                        {t.discount_tp}%
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Không có sản phẩm phù hợp.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm font-medium text-terracotta hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <EditProductDialog
        open={Boolean(editProduct)}
        onOpenChange={(o) => {
          if (!o) setEditProduct(null);
        }}
        product={editProduct}
        onEditImages={() => {
          if (editProduct) {
            setImagesProduct(editProduct);
            setEditProduct(null);
          }
        }}
      />
      <EditProductImagesDialog
        open={Boolean(imagesProduct)}
        onOpenChange={(o) => {
          if (!o) setImagesProduct(null);
        }}
        product={imagesProduct}
      />
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="size-8 grid place-items-center rounded-md ring-1 ring-black/5 bg-card text-muted-foreground hover:bg-surface-strong disabled:opacity-40"
        aria-label="Trang trước"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`e-${i}`}
            className="size-8 grid place-items-center text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={
              p === page
                ? "size-8 grid place-items-center rounded-md text-xs font-medium bg-terracotta text-primary-foreground"
                : "size-8 grid place-items-center rounded-md text-xs font-medium ring-1 ring-black/5 bg-card text-foreground hover:bg-surface-strong"
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="size-8 grid place-items-center rounded-md ring-1 ring-black/5 bg-card text-muted-foreground hover:bg-surface-strong disabled:opacity-40"
        aria-label="Trang sau"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function pageWindow(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([
    1,
    total,
    page,
    page - 1,
    page + 1,
    page - 2,
    page + 2,
  ]);
  const nums = Array.from(set)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i]! - nums[i - 1]! > 1) out.push("…");
    out.push(nums[i]!);
  }
  return out;
}


