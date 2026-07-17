import { Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-14 border-b border-border bg-surface/60 backdrop-blur-sm flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex items-center gap-3 w-96">
        <Search className="size-4 text-muted-foreground/70" />
        <input
          type="text"
          placeholder="Tìm khách hàng, mã gạch, dự án..."
          className="text-sm bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="text-xs font-medium text-foreground px-3 py-1.5 bg-card ring-1 ring-black/5 rounded shadow-sm hover:bg-surface-strong transition-colors">
          Tạo báo giá
        </button>
        <button className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm hover:opacity-90 transition-opacity">
          + Khách hàng mới
        </button>
      </div>
    </header>
  );
}
