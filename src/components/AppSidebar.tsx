import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Wallet,
  StickyNote,
  Grid2x2,
  Hexagon,
  Square,
  RectangleHorizontal,
} from "lucide-react";
import { PRODUCT_GROUPS } from "@/lib/product-categories";

const mainNav = [
  { to: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/khach-hang", label: "Khách hàng", icon: Users },
  { to: "/co-hoi", label: "Cơ hội", icon: Target },
  { to: "/bao-gia", label: "Báo giá & Đơn hàng", icon: FileText },
  { to: "/cong-no", label: "Công nợ", icon: Wallet },
  { to: "/ghi-chu", label: "Ghi chú", icon: StickyNote },
] as const;

const productIcons = {
  "gach-the": RectangleHorizontal,
  "gach-mosaic": Grid2x2,
  "gach-bong": Hexagon,
  "gach-300x600": Square,
} as const;

export function AppSidebar() {
  const { pathname, search } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      search: s.location.search as { nhom?: string },
    }),
  });

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface">
      <div className="p-5 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Innomat"
          width={36}
          height={36}
          className="size-9 rounded-lg object-contain bg-white ring-1 ring-black/5 flex-shrink-0 p-0.5"
        />
        <div className="min-w-0">
          <p className="font-medium tracking-tight text-foreground text-sm">
            Innomat CRM
          </p>
          <p className="text-[10px] text-muted-foreground">Showroom Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <div className="pt-2 pb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Quản lý
        </div>
        {mainNav.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                active
                  ? "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-surface-strong rounded-md shadow-sm ring-1 ring-black/5"
                  : "flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-strong/50 rounded-md transition-colors"
              }
            >
              <Icon
                className={
                  active
                    ? "size-4 flex-shrink-0 text-terracotta"
                    : "size-4 flex-shrink-0 text-muted-foreground/70"
                }
              />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 pb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Sản phẩm
        </div>
        {PRODUCT_GROUPS.map((g) => {
          const active =
            pathname === "/san-pham" && search?.nhom === g.slug;
          const Icon = productIcons[g.slug];
          return (
            <Link
              key={g.slug}
              to="/san-pham"
              search={{ nhom: g.slug }}
              className={
                active
                  ? "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-surface-strong rounded-md shadow-sm ring-1 ring-black/5"
                  : "flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-strong/50 rounded-md transition-colors"
              }
            >
              <Icon
                className={
                  active
                    ? "size-4 flex-shrink-0 text-terracotta"
                    : "size-4 flex-shrink-0 text-muted-foreground/70"
                }
              />
              {g.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-1">
          <div className="size-8 bg-surface-strong ring-1 ring-black/5 rounded-full grid place-items-center flex-shrink-0 text-xs font-medium text-foreground">
            TK
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              Thế Kiệt
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Sales Executive
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
