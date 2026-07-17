import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  receivables,
  receivableStatusMeta,
  getCustomer,
  type Receivable,
} from "@/data/mock";
import { formatVND, formatVNDShort } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/cong-no")({
  head: () => ({
    meta: [{ title: "Công nợ — Gạch Việt CRM" }],
  }),
  component: DebtPage,
});

const filters: { key: "all" | Receivable["status"]; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "overdue", label: "Quá hạn" },
  { key: "due-soon", label: "Sắp đến hạn" },
  { key: "on-track", label: "Trong hạn" },
];

function DebtPage() {
  const [filter, setFilter] = useState<"all" | Receivable["status"]>("all");
  const visible =
    filter === "all"
      ? receivables
      : receivables.filter((r) => r.status === filter);

  const totals = {
    overdue: receivables
      .filter((r) => r.status === "overdue")
      .reduce((s, r) => s + r.amount, 0),
    dueSoon: receivables
      .filter((r) => r.status === "due-soon")
      .reduce((s, r) => s + r.amount, 0),
    all: receivables.reduce((s, r) => s + r.amount, 0),
  };

  return (
    <>
      <PageHeader
        title="Quản lý công nợ"
        description="Theo dõi các khoản phải thu từ khách hàng và nhà thầu."
        actions={
          <div className="flex gap-1 p-1 bg-surface-strong/70 rounded-lg ring-1 ring-black/5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "px-3 py-1 text-xs font-medium bg-card rounded shadow-sm text-foreground"
                    : "px-3 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card ring-1 ring-black/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-destructive" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Quá hạn
            </p>
          </div>
          <p className="text-2xl font-medium text-destructive">
            {formatVNDShort(totals.overdue)}
          </p>
        </div>
        <div className="bg-card ring-1 ring-black/5 rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Sắp đến hạn (7 ngày)
          </p>
          <p className="text-2xl font-medium text-amber-700">
            {formatVNDShort(totals.dueSoon)}
          </p>
        </div>
        <div className="bg-card ring-1 ring-black/5 rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Tổng phải thu
          </p>
          <p className="text-2xl font-medium text-foreground">
            {formatVNDShort(totals.all)}
          </p>
        </div>
      </div>

      <div className="bg-card ring-1 ring-black/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-strong/40">
              <th className="px-5 py-3 font-medium">Hoá đơn</th>
              <th className="px-5 py-3 font-medium">Khách hàng</th>
              <th className="px-5 py-3 font-medium">Dự án</th>
              <th className="px-5 py-3 font-medium">Hạn thanh toán</th>
              <th className="px-5 py-3 font-medium text-right">Số tiền</th>
              <th className="px-5 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((r) => {
              const c = getCustomer(r.customerId);
              const meta = receivableStatusMeta[r.status];
              return (
                <tr
                  key={r.invoice}
                  className="hover:bg-surface-strong/30 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-[11px] text-foreground">
                    {r.invoice}
                  </td>
                  <td className="px-5 py-3 text-foreground">{c.name}</td>
                  <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">
                    {c.project}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {r.dueDate}
                    {r.daysOverdue ? (
                      <span className="ml-2 text-[10px] text-destructive font-medium">
                        (quá {r.daysOverdue} ngày)
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-medium ${
                      r.status === "overdue"
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {formatVND(r.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
