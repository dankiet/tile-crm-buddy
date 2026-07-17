import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CustomerCard } from "@/components/CustomerCard";
import { customers, notes, type CustomerStatus } from "@/data/mock";
import { formatVNDShort } from "@/lib/format";

export const Route = createFileRoute("/_app/khach-hang")({
  head: () => ({
    meta: [{ title: "Khách hàng — Gạch Việt CRM" }],
  }),
  component: CustomersPage,
});

const filters: { key: "all" | CustomerStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "consulting", label: "Đang tư vấn" },
  { key: "quoted", label: "Gửi báo giá" },
  { key: "closed", label: "Đã chốt" },
  { key: "delivering", label: "Đang giao" },
];

function CustomersPage() {
  const [filter, setFilter] = useState<"all" | CustomerStatus>("all");
  const visible =
    filter === "all" ? customers : customers.filter((c) => c.status === filter);

  const pendingRevenue = customers
    .filter((c) => c.status === "quoted" || c.status === "consulting")
    .reduce((s, c) => s + c.dealValue, 0);

  return (
    <>
      <PageHeader
        title="Danh mục khách hàng hiện tại"
        description={`Theo dõi tiến độ dự án và nhu cầu vật liệu của ${customers.length} khách hàng đang chăm sóc.`}
        actions={
          <div className="flex gap-1 p-1 bg-surface-strong/70 rounded-lg ring-1 ring-black/5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "px-3 py-1 text-xs font-medium bg-card rounded shadow-sm text-foreground"
                    : "px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((c) => (
          <CustomerCard key={c.id} customer={c} />
        ))}
      </div>

      <div className="mt-12 grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Ghi chú hoạt động gần đây
          </h2>
          <div className="bg-card ring-1 ring-black/5 rounded-xl divide-y divide-border">
            {notes.slice(0, 5).map((n) => (
              <div key={n.id} className="p-4 flex gap-4">
                <div className="size-2 bg-stone-300 rounded-full mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.time} · {n.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Thông số tuần này
          </h2>
          <div className="space-y-4">
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Doanh thu chờ duyệt
              </p>
              <p className="text-xl font-medium text-foreground">
                {formatVNDShort(pendingRevenue)}
              </p>
              <div className="mt-2 w-full h-1.5 bg-surface-strong rounded-full overflow-hidden">
                <div className="bg-terracotta h-full w-[65%]" />
              </div>
            </div>
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Tỷ lệ chốt hợp đồng
              </p>
              <p className="text-xl font-medium text-foreground">24%</p>
              <p className="text-[10px] text-moss mt-1 font-medium">
                +3% so với tháng trước
              </p>
            </div>
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Khách hàng mới trong tháng
              </p>
              <p className="text-xl font-medium text-foreground">7</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Trung bình 2 khách / tuần
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
