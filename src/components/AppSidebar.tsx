import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Package,
  Wallet,
  StickyNote,
  Layers,
} from "lucide-react";

const mainNav = [
  { to: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/khach-hang", label: "Khách hàng", icon: Users },
  { to: "/co-hoi", label: "Cơ hội", icon: Target },
  { to: "/bao-gia", label: "Báo giá & Đơn hàng", icon: FileText },
  { to: "/cong-no", label: "Công nợ", icon: Wallet },
  { to: "/ghi-chu", label: "Ghi chú", icon: StickyNote },
] as const;

const productNav = [
  { to: "/san-pham", label: "Gạch ốp lát", icon: Layers },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface">
      <div className="p-5 flex items-center gap-2">
        <div className="size-7 rounded-md bg-terracotta grid place-items-center text-primary-foreground">
          <Package className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium tracking-tight text-foreground text-sm">
            Gạch Việt CRM
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
        {productNav.map((item) => {
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
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-1">
          <div className="size-8 bg-surface-strong ring-1 ring-black/5 rounded-full grid place-items-center flex-shrink-0 text-xs font-medium text-foreground">
            MH
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              Minh Hoàng
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Quản lý Showroom
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
