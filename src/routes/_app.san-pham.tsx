import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProductImage } from "@/components/ProductImage";
import { EditProductDialog } from "@/components/EditProductDialog";
import { EditProductImagesDialog } from "@/components/EditProductImagesDialog";
import { FilterChip } from "@/components/product-filter/FilterChip";
import { PriceFilter } from "@/components/product-filter/PriceFilter";
import { MultiSelectFilter } from "@/components/product-filter/MultiSelectFilter";
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
  Flame,
  Images,
  Pencil,
  Search,
  X,
} from "lucide-react";

const PAGE_SIZE = 24;

function formatMoneyShort(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function parseCsv(v: unknown): string[] {
  if (typeof v !== "string" || !v.trim()) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type SanPhamSearch = {
  nhom?: string;
  q?: string;
  min?: number;
  max?: number;
  colors?: string[];
  sizes?: string[];
  hot?: boolean;
  page?: number;
};

export const Route = createFileRoute("/_app/san-pham")({
  validateSearch: (search: Record<string, unknown>): SanPhamSearch => ({
    nhom: typeof search.nhom === "string" ? search.nhom : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    min: typeof search.min === "number" ? search.min : undefined,
    max: typeof search.max === "number" ? search.max : undefined,
    colors: Array.isArray(search.colors)
      ? (search.colors as string[])
      : parseCsv(search.colors),
    sizes: Array.isArray(search.sizes)
      ? (search.sizes as string[])
      : parseCsv(search.sizes),
    hot: search.hot === true || search.hot === "1",
    page:
      typeof search.page === "number" && search.page > 0
        ? Math.floor(search.page)
        : undefined,
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
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const {
    nhom,
    q: qParam = "",
    min: minParam = 0,
    max: maxParam = 0,
    colors: colorsParam = [],
    sizes: sizesParam = [],
    hot: hotParam = false,
    page: pageParam = 1,
  } = searchParams;

  const category = categoryFromSlug(nhom);
  const groupLabel =
    category === "all" ? "Sản phẩm" : labelFromCategory(category);

  // Input search dùng local state + debounce vào URL để đỡ giật
  const [searchDraft, setSearchDraft] = useState(qParam);
  useEffect(() => setSearchDraft(qParam), [qParam]);

  useEffect(() => {
    if (searchDraft === (qParam ?? "")) return;
    const t = setTimeout(() => {
      navigate({
        search: (prev: SanPhamSearch) => ({
          ...prev,
          q: searchDraft.trim() ? searchDraft : undefined,
          page: undefined,
        }),
        replace: true,
      });
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const deferredSearch = useDeferredValue(searchDraft);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imagesProduct, setImagesProduct] = useState<Product | null>(null);

  /** Scope theo nhóm sidebar (chỉ đổi khi nhóm đổi) */
  const scoped = useMemo(() => {
    if (category === "all") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  /** Chỉ số tìm kiếm normalize sẵn — filter nhanh hơn nhiều */
  const indexed = useMemo(
    () =>
      scoped.map((p) => ({
        p,
        haystack: [
          p.code,
          p.internal_code || "",
          p.name,
          p.size,
          p.color || "",
          p.collection || "",
          p.material,
        ]
          .join(" ")
          .toLowerCase(),
      })),
    [scoped],
  );

  const colorOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const { p } of indexed) {
      const c = (p.color || "").trim();
      if (!c) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "vi"))
      .map(([value, count]) => ({ value, count }));
  }, [indexed]);

  const sizeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const { p } of indexed) {
      const s = (p.size || "").trim();
      if (!s) continue;
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, [indexed]);

  const hotInScope = useMemo(
    () => indexed.filter(({ p }) => p.is_hot).length,
    [indexed],
  );

  const colorSet = useMemo(() => new Set(colorsParam), [colorsParam]);
  const sizeSet = useMemo(() => new Set(sizesParam), [sizesParam]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return indexed
      .filter(({ p, haystack }) => {
        if (minParam && p.retail_price < minParam) return false;
        if (maxParam && p.retail_price > maxParam) return false;
        if (colorSet.size && !colorSet.has((p.color || "").trim()))
          return false;
        if (sizeSet.size && !sizeSet.has((p.size || "").trim())) return false;
        if (hotParam && !p.is_hot) return false;
        if (!q) return true;
        return haystack.includes(q);
      })
      .map((x) => x.p);
  }, [indexed, deferredSearch, minParam, maxParam, colorSet, sizeSet, hotParam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageParam, totalPages);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const withImg = scoped.filter((p) => p.image_path).length;
  const hotTotal = scoped.filter((p) => p.is_hot).length;

  const activeCount =
    (deferredSearch.trim() ? 1 : 0) +
    (minParam || maxParam ? 1 : 0) +
    colorsParam.length +
    sizesParam.length +
    (hotParam ? 1 : 0);
  const hasActiveFilter = activeCount > 0;

  const priceSummary =
    minParam || maxParam
      ? `${minParam ? formatMoneyShort(minParam) : "…"}–${maxParam ? formatMoneyShort(maxParam) : "…"}`
      : null;

  function setSearch(patch: Partial<SanPhamSearch>) {
    navigate({
      search: (prev: SanPhamSearch) => {
        const next: SanPhamSearch = { ...prev, ...patch, page: undefined };
        // Dọn field rỗng để URL gọn
        if (!next.q) delete next.q;
        if (!next.min) delete next.min;
        if (!next.max) delete next.max;
        if (!next.colors || next.colors.length === 0) delete next.colors;
        if (!next.sizes || next.sizes.length === 0) delete next.sizes;
        if (!next.hot) delete next.hot;
        return next;
      },
      replace: true,
    });
  }

  function goPage(next: number) {
    navigate({
      search: (prev: SanPhamSearch) => ({
        ...prev,
        page: next === 1 ? undefined : next,
      }),
      replace: true,
    });
  }

  function clearFilters() {
    setSearchDraft("");
    setSearch({
      q: undefined,
      min: undefined,
      max: undefined,
      colors: undefined,
      sizes: undefined,
      hot: undefined,
    });
  }

  return (
    <>
      <PageHeader
        title={groupLabel}
        description={`${scoped.length} mã · ${withImg} ảnh · ${hotTotal} bán chạy`}
      />

      {/* Toolbar 1 hàng: search + chips */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Tìm mã, tên, kích thước, màu, bộ sưu tập…"
              className="h-10 w-full text-sm pl-10 pr-9 rounded-full bg-transparent border border-border/80 outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/15 text-foreground placeholder:text-muted-foreground/60"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => setSearchDraft("")}
                aria-label="Xoá tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="Giá" summary={priceSummary}>
              <PriceFilter
                min={minParam}
                max={maxParam}
                onChange={({ min, max }) =>
                  setSearch({
                    min: min || undefined,
                    max: max || undefined,
                  })
                }
              />
            </FilterChip>

            <FilterChip label="Màu" count={colorsParam.length}>
              <MultiSelectFilter
                title="Chọn màu"
                options={colorOptions}
                selected={colorsParam}
                onChange={(next) =>
                  setSearch({ colors: next.length ? next : undefined })
                }
                searchable
              />
            </FilterChip>

            <FilterChip label="Kích thước" count={sizesParam.length}>
              <MultiSelectFilter
                title="Chọn kích thước"
                options={sizeOptions}
                selected={sizesParam}
                onChange={(next) =>
                  setSearch({ sizes: next.length ? next : undefined })
                }
              />
            </FilterChip>

            <button
              type="button"
              onClick={() => setSearch({ hot: hotParam ? undefined : true })}
              className={
                hotParam
                  ? "h-9 shrink-0 px-3 rounded-full text-sm font-medium bg-terracotta text-primary-foreground inline-flex items-center gap-1.5 shadow-sm"
                  : "h-9 shrink-0 px-3 rounded-full text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-surface-strong/60 transition-colors inline-flex items-center gap-1.5"
              }
              aria-pressed={hotParam}
            >
              <Flame className="size-3.5" />
              <span>Bán chạy</span>
              <span
                className={
                  hotParam
                    ? "opacity-80 tabular-nums"
                    : "opacity-70 tabular-nums"
                }
              >
                {hotInScope}
              </span>
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {deferredSearch.trim() && (
              <ActiveTag onClear={() => setSearchDraft("")}>
                “{deferredSearch.trim()}”
              </ActiveTag>
            )}
            {priceSummary && (
              <ActiveTag
                onClear={() =>
                  setSearch({ min: undefined, max: undefined })
                }
              >
                Giá {priceSummary}
              </ActiveTag>
            )}
            {colorsParam.map((c) => (
              <ActiveTag
                key={`c-${c}`}
                onClear={() =>
                  setSearch({
                    colors: colorsParam.filter((x) => x !== c),
                  })
                }
              >
                {c}
              </ActiveTag>
            ))}
            {sizesParam.map((s) => (
              <ActiveTag
                key={`s-${s}`}
                onClear={() =>
                  setSearch({
                    sizes: sizesParam.filter((x) => x !== s),
                  })
                }
              >
                {s}
              </ActiveTag>
            ))}
            {hotParam && (
              <ActiveTag onClear={() => setSearch({ hot: undefined })}>
                Bán chạy
              </ActiveTag>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-terracotta transition-colors ml-1"
            >
              Xoá tất cả ({activeCount})
            </button>
          </div>
        )}
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
          <Pagination page={page} totalPages={totalPages} onChange={goPage} />
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
          <Pagination page={page} totalPages={totalPages} onChange={goPage} />
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


