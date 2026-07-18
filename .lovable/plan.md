
# Plan: Tối ưu filter Sản phẩm + hiệu năng

Mục tiêu chính: gom filter về **1 toolbar duy nhất** kiểu chip + popover, đồng bộ state vào URL (search params), và giảm chi phí render khi danh sách sản phẩm lớn.

## 1. Redesign filter (trang `/san-pham`)

### Layout mới — 1 hàng duy nhất

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search (flex-1) │ [Giá ▾] [Màu · 2 ▾] [Size ▾] [🔥 Bán chạy] │ Xoá ✕ │
└──────────────────────────────────────────────────────────────────────────┘
│ Chip active: "xanh mint" ✕   "300k–500k" ✕   "300x600" ✕                 │
```

- **Search box** ở trái, flex-1, giữ icon + debounce 200ms.
- **Chip filter** dạng button pill, có badge số khi đã chọn (`Màu · 2`). Click mở **popover** (dùng Popover shadcn) chứa control tương ứng:
  - **Giá**: 2 input Từ / Đến + preset nhanh (`<300k`, `300–500k`, `500k–1tr`, `>1tr`).
  - **Màu**: list checkbox có swatch + count (multi-select thay vì single hiện tại).
  - **Size**: list checkbox lấy từ `scoped` (multi-select) — filter mới, đáp ứng "thiếu tiêu chí" tiềm ẩn nhưng không nở thêm hàng.
- **Nút "Bán chạy"** giữ dạng toggle chip cuối hàng.
- **Xoá lọc** ở bên phải, chỉ hiện khi `hasActiveFilter`. Ngay dưới toolbar là **hàng chip active** (tag từng filter đang bật, click ✕ để bỏ riêng lẻ).

Popover đóng khi click ngoài. Trên mobile (`<sm`), toolbar cuộn ngang (`overflow-x-auto`) hoặc gom vào 1 nút "Bộ lọc" mở Sheet.

### State → URL

Chuyển 5 state cục bộ (`priceMin/priceMax/color/hotOnly/search` + `page`) sang **search params** dùng `validateSearch` + `zodValidator` + `fallback`:

```ts
const schema = z.object({
  nhom: fallback(z.string(), PRODUCT_GROUPS[0].slug).default(...),
  q:    fallback(z.string(), "").default(""),
  min:  fallback(z.number().int(), 0).default(0),   // 0 = bỏ
  max:  fallback(z.number().int(), 0).default(0),
  color: fallback(z.string().array(), []).default([]),
  size:  fallback(z.string().array(), []).default([]),
  hot:   fallback(z.boolean(), false).default(false),
  page:  fallback(z.number().int(), 1).default(1),
});
```

Lợi ích: share link, F5 giữ nguyên, back/forward hoạt động, đổi nhóm sidebar reset đúng qua `stripSearchParams` cho các key khác `nhom`.

## 2. Hiệu năng

Đã đo: file `_app.san-pham.tsx` render 1 grid từ `scoped.filter(...)`, mỗi item có `ProductImage`. Với data hiện tại đủ dùng, nhưng có 3 điểm dễ tối ưu:

1. **Debounce search** 200ms (dùng `useDeferredValue` của React 19 — không cần lib).
2. **Memo hoá chuẩn hoá dữ liệu**: build 1 lần `productIndex` với các trường lowercase (`code`, `name`, `size`, `color`, `collection`, `material`) để `filter` không `.toLowerCase()` mỗi keypress. Cache theo `products` reference.
3. **Image lazy + decode**: đảm bảo `<ProductImage>` có `loading="lazy"` + `decoding="async"` (kiểm tra và bổ sung nếu thiếu). Ảnh dưới fold không block LCP.
4. **Không virtualize** ở lượt này (PAGE_SIZE=24 đã đủ nhẹ). Ghi chú để tương lai dùng `@tanstack/react-virtual` nếu bỏ phân trang.
5. **Loader**: hiện `fetchProducts` trả full list. Giữ nguyên (đơn giản, cache tốt), chỉ đảm bảo `staleTime` hợp lý — kiểm tra `src/api/functions.ts` xem có TanStack Query wrapping; nếu chưa, không đổi ở PR này.

## 3. Ngoài phạm vi (lượt này)

- Không đổi filter ở các trang khác (Khách hàng, Báo giá, Công nợ) — sẽ làm ở lượt sau nếu OK pattern.
- Không đổi cấu trúc data / server function.
- Không đụng design system tổng thể.

## Chi tiết kỹ thuật

**File sẽ sửa:**
- `src/routes/_app.san-pham.tsx` — rewrite filter block + đổi state sang `Route.useSearch()` + `useNavigate({ from })` với `search: (prev) => ({ ...prev, ... })`.
- **Tạo mới** `src/components/product-filter/FilterChip.tsx` — button pill + badge + popover wrapper (dùng `@/components/ui/popover`).
- **Tạo mới** `src/components/product-filter/PriceFilter.tsx`, `ColorFilter.tsx`, `SizeFilter.tsx` — 3 popover content.
- **Tạo mới** `src/components/product-filter/ActiveFilterBar.tsx` — hàng chip active có ✕.

**Bảo đảm shadcn Popover có sẵn** — nếu chưa, thêm `src/components/ui/popover.tsx` chuẩn shadcn (Radix `@radix-ui/react-popover`, có sẵn hoặc `bun add`).

**URL sync pattern:**
```ts
const nav = useNavigate({ from: Route.fullPath });
const setFilter = (patch) => nav({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
```

**Reset khi đổi nhóm:** dùng `search.middlewares: [stripSearchParams({ q: "", min: 0, max: 0, color: [], size: [], hot: false, page: 1 })]` để URL sạch khi giá trị = mặc định.

**Perf:**
- `useDeferredValue(q)` cho search input.
- `useMemo` `normalized = products.map(p => ({ ...p, _lc: {...} }))` cache theo `products`.
- Thêm `loading="lazy" decoding="async"` cho `<img>` trong `ProductImage` (đọc file trước, nếu đã có thì bỏ qua).

## Kết quả kỳ vọng

- Toolbar filter gọn 1 hàng, mở popover chọn nhanh.
- Copy link `/san-pham?nhom=gach-the&color=Xanh&min=300000` → share được.
- Gõ search không giật khi list lớn.
- Đổi nhóm sidebar tự reset các filter phụ như hiện tại, nhưng qua URL sạch.

