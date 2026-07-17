import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  customers,
  pipelineStages,
  receivables,
  notes,
  orders,
} from "@/data/mock";
import { formatVNDShort } from "@/lib/format";
import { TrendingUp, Users, Wallet, Package } from "lucide-react";

export const Route = createFileRoute("/_app/tong-quan")({
  head: () => ({
    meta: [{ title: "Tổng quan — Gạch Việt CRM" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const totalRevenue = customers.reduce((s, c) => s + c.dealValue, 0);
  const totalDebt = receivables.reduce((s, r) => s + r.amount, 0);
  const overdueDebt = receivables
    .filter((r) => r.status === "overdue")
    .reduce((s, r) => s + r.amount, 0);
  const pendingOrders = orders.filter((o) => o.status !== "delivered").length;

  const kpis = [
    {
      label: "Doanh thu dự kiến",
      value: formatVNDShort(totalRevenue),
      hint: "Tổng giá trị pipeline",
      icon: TrendingUp,
      accent: "text-moss",
    },
    {
      label: "Khách hàng đang chăm",
      value: `${customers.length}`,
      hint: "+7 khách mới trong tháng",
      icon: Users,
      accent: "text-foreground",
    },
    {
      label: "Công nợ phải thu",
      value: formatVNDShort(totalDebt),
      hint: `${formatVNDShort(overdueDebt)} quá hạn`,
      icon: Wallet,
      accent: "text-terracotta",
    },
    {
      label: "Đơn chờ xử lý",
      value: `${pendingOrders}`,
      hint: "Đang soạn kho + vận chuyển",
      icon: Package,
      accent: "text-foreground",
    },
  ];

  const stageCounts = pipelineStages.map((s) => ({
    ...s,
    count: customers.filter((c) => c.status === s.key).length,
    value: customers
      .filter((c) => c.status === s.key)
      .reduce((sum, c) => sum + c.dealValue, 0),
  }));

  const maxStageValue = Math.max(...stageCounts.map((s) => s.value), 1);

  return (
    <>
      <PageHeader
        title="Xin chào, Minh Hoàng"
        description="Bức tranh tổng quan showroom hôm nay. Thứ Ba, 14 tháng 5, 2024."
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-card ring-1 ring-black/5 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {k.label}
                </p>
                <Icon className={`size-4 ${k.accent}`} />
              </div>
              <p className="text-2xl font-medium text-foreground">{k.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{k.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-card ring-1 ring-black/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-foreground">
              Pipeline theo giai đoạn
            </h2>
            <span className="text-xs text-muted-foreground">
              5 giai đoạn · {customers.length} cơ hội
            </span>
          </div>
          <div className="space-y-4">
            {stageCounts.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {s.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-surface-strong px-1.5 py-0.5 rounded">
                      {s.count} khách
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatVNDShort(s.value)}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-strong rounded-full overflow-hidden">
                  <div
                    className="bg-terracotta h-full rounded-full transition-all"
                    style={{
                      width: `${(s.value / maxStageValue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Nhật ký hoạt động
          </h2>
          <div className="bg-card ring-1 ring-black/5 rounded-xl divide-y divide-border">
            {notes.slice(0, 4).map((n) => (
              <div key={n.id} className="p-4">
                <p className="text-xs text-foreground line-clamp-3">
                  {n.content}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {n.time} · {n.author}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
