import { Pencil, MapPin } from "lucide-react";
import { statusMeta, type Customer } from "@/lib/types";
import { formatVND } from "@/lib/format";

export function CustomerCard({
  customer,
  debt = 0,
  onClick,
  onEdit,
}: {
  customer: Customer;
  debt?: number;
  onClick?: () => void;
  onEdit?: () => void;
}) {
  const status = statusMeta[customer.status];
  const hasDebt = debt > 0;
  const initial = customer.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      role={onClick || onEdit ? "button" : undefined}
      tabIndex={onClick || onEdit ? 0 : undefined}
      onClick={onClick ?? onEdit}
      onKeyDown={
        onClick || onEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") (onClick ?? onEdit)?.();
            }
          : undefined
      }
      className="group bg-card ring-1 ring-black/5 rounded-xl p-5 flex flex-col gap-4 hover:ring-stone-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {customer.name}
            {customer.source ? ` · ${customer.source}` : ""}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${status.className}`}
            >
              {status.label}
            </span>
            {customer.region ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="size-3" />
                {customer.region}
              </span>
            ) : null}
          </div>
        </div>
        <div className="size-9 rounded-full ring-1 ring-black/5 flex-shrink-0 bg-surface-strong grid place-items-center text-xs font-medium text-foreground">
          {initial}
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {customer.phone ? <p>ĐT: {customer.phone}</p> : null}
        {customer.note ? (
          <p className="line-clamp-2 text-foreground/80">{customer.note}</p>
        ) : (
          <p className="text-muted-foreground/70 italic">Chưa có ghi chú</p>
        )}
        <p className="text-[10px]">Cập nhật: {customer.updated_at}</p>
      </div>

      <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">
            {hasDebt ? "Công nợ" : "Trạng thái"}
          </p>
          <p
            className={
              hasDebt
                ? "text-sm font-medium text-terracotta"
                : "text-sm font-medium text-foreground"
            }
          >
            {hasDebt ? formatVND(debt) : status.label}
          </p>
        </div>
        <button
          type="button"
          className="size-8 flex items-center justify-center rounded-full hover:bg-surface-strong transition-colors text-muted-foreground hover:text-foreground"
          title="Sửa khách hàng"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          <Pencil className="size-4" />
        </button>
      </div>
    </div>
  );
}
