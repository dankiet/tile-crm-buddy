import { MoreHorizontal, MapPin } from "lucide-react";
import { getTile, statusMeta, type Customer } from "@/data/mock";
import { formatVND } from "@/lib/format";

export function CustomerCard({ customer }: { customer: Customer }) {
  const status = statusMeta[customer.status];
  const firstTile = getTile(customer.tiles[0].tileId);
  const hasDebt = customer.debt > 0;

  return (
    <div className="group bg-card ring-1 ring-black/5 rounded-xl p-5 flex flex-col gap-4 hover:ring-stone-300 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {customer.name} — {customer.project}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${status.className}`}
            >
              {status.label}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="size-3" />
              {customer.region}
            </span>
          </div>
        </div>
        <div
          className="size-9 rounded-full overflow-hidden ring-1 ring-black/5 flex-shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${firstTile.image})` }}
          aria-label={firstTile.name}
        />
      </div>

      <div className="space-y-2.5">
        {customer.tiles.map((ct) => {
          const tile = getTile(ct.tileId);
          return (
            <div key={ct.tileId} className="flex items-center gap-3">
              <div
                className="size-12 rounded-md bg-cover bg-center outline outline-1 -outline-offset-1 outline-black/5 flex-shrink-0"
                style={{ backgroundImage: `url(${tile.image})` }}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate">
                  {tile.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ct.area} · {ct.quantityM2}m²
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider">
            {hasDebt ? "Công nợ" : "Giá trị dự kiến"}
          </p>
          <p
            className={
              hasDebt
                ? "text-sm font-medium text-terracotta"
                : "text-sm font-medium text-foreground"
            }
          >
            {formatVND(hasDebt ? customer.debt : customer.dealValue)}
          </p>
        </div>
        <button className="size-8 flex items-center justify-center rounded-full hover:bg-surface-strong transition-colors text-muted-foreground">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}
