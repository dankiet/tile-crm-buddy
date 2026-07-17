# Kế hoạch: CRM Gạch Việt (Showroom Card Grid)

Build giao diện quản lý CRM cho ngành gạch ốp lát, dùng data demo (không backend). Bám theo hướng đã chọn: sidebar terracotta + thẻ khách hàng dạng showroom + tone stone/kem.

## Design tokens (src/styles.css)
- Font: `Instrument Sans` (load qua `<link>` trong `__root.tsx`)
- Semantic tokens (oklch): `background` = stone-100, `card` = stone-50, `foreground` = stone-900, `muted-foreground` = stone-500, `border` = stone-200
- Custom tokens thêm mới: `--terracotta` (#9a3412), `--moss` (#3f6212) và map vào `@theme inline` → utility `bg-terracotta`, `text-terracotta`, `bg-moss`, `text-moss`

## Cấu trúc route
- `src/routes/__root.tsx` — set head (title "Gạch Việt CRM"), load font, giữ `<Outlet />`
- `src/routes/index.tsx` — redirect `/` → `/khach-hang` (thay placeholder)
- Layout dùng chung ở `src/routes/_app.tsx` (sidebar + top bar + `<Outlet />`)
  - `_app.tong-quan.tsx` — Dashboard: KPI cards, mini pipeline funnel, revenue chart, recent activity
  - `_app.khach-hang.tsx` — Trang chính (mặc định active): grid thẻ khách hàng showroom + tabs lọc + panel ghi chú + panel thông số
  - `_app.co-hoi.tsx` — Pipeline dạng kanban 5 cột (Mới → Tư vấn → Báo giá → Chốt → Giao hàng)
  - `_app.bao-gia.tsx` — Bảng báo giá + đơn hàng, tab switch giữa 2 loại
  - `_app.cong-no.tsx` — Bảng công nợ với filter (quá hạn / sắp đến hạn / đã thanh toán)
  - `_app.ghi-chu.tsx` — Timeline ghi chú theo khách
  - `_app.san-pham.tsx` — Catalog mã gạch (grid swatch + tồn kho + giá)

## Components (src/components/)
- `AppSidebar.tsx` — sidebar 240px, logo terracotta, nhóm "Quản lý" và "Sản phẩm", user footer, dùng `<Link>` + `useRouterState` để active
- `TopBar.tsx` — search input + 2 nút CTA ("Tạo báo giá", "Khách hàng mới")
- `CustomerCard.tsx` — thẻ khách hàng: tên+dự án, badge trạng thái (chốt/tư vấn/báo giá), 2 dòng gạch sample (swatch 48px + tên mã + khu vực), footer "Giá trị dự kiến" hoặc "Công nợ"
- `SectionHeader.tsx`, `StatCard.tsx`, `NoteItem.tsx`, `PipelineColumn.tsx`, `DealCard.tsx`

## Data demo (src/data/mock.ts)
- 12 khách hàng VN thực tế: "Anh Tuấn - Biệt thự Vinhomes", "Chị Lan - Penthouse Serenity", "KTS Hoàng - Dự án Hội An", "Cty An Gia - Chung cư 5 block", "Chị Mai - Nhà phố Q7"...
- Mã gạch: `Granite 60x60 Bóng Kiếng`, `Ceramic 30x60 giả gỗ`, `Marble Carrara 80x80`, `Mosaic Dark Grey 30x30`, `Gạch gốm Terracotta`, `Gạch thẻ Handmade Green`, `Porcelain 80x80 Mờ`...
- Trạng thái deal, giá trị (VND), công nợ, ghi chú, ngày cập nhật

## Swatch textures
Generate 6 ảnh swatch tile (512x512) lưu `src/assets/tiles/` dùng cho card avatar & sample thumbnails: granite bóng, ceramic vân gỗ, marble Carrara, mosaic xám đậm, terracotta thô, gạch men xanh handmade.

## Kỹ thuật
- Không dùng `bg-white`, `text-black` — dùng token
- Tanstack Router file-based, `<Link>` cho nav
- Head metadata riêng cho mỗi route (title VN)
- Format tiền VND qua helper `formatVND()`
- Không bật Lovable Cloud (chỉ UI demo)

## Ngoài phạm vi
- Đăng nhập, database, edit/create thật (button chỉ là UI)
- Trang chi tiết khách hàng riêng (có thể mở drawer sau nếu cần)
