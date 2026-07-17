import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { tiles } from "@/data/mock";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/_app/san-pham")({
  head: () => ({
    meta: [{ title: "Sản phẩm gạch — Gạch Việt CRM" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Danh mục gạch ốp lát"
        description="Bộ sưu tập gạch showroom đang phân phối, cập nhật tồn kho theo thời gian thực."
        actions={
          <button className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm">
            + Nhập mã mới
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tiles.map((t) => (
          <div
            key={t.id}
            className="bg-card ring-1 ring-black/5 rounded-xl overflow-hidden hover:ring-stone-300 hover:shadow-sm transition-all"
          >
            <div className="aspect-square w-full overflow-hidden bg-surface-strong">
              <img
                src={t.image}
                alt={t.name}
                width={512}
                height={512}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] text-muted-foreground">
                {t.code}
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                {t.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t.size} · {t.category}
              </p>
              <div className="flex items-end justify-between mt-3 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Giá
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {formatVND(t.price)}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      /m²
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Tồn
                  </p>
                  <p
                    className={
                      t.stock < 300
                        ? "text-sm font-medium text-terracotta"
                        : "text-sm font-medium text-moss"
                    }
                  >
                    {t.stock}m²
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
