import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  quotes,
  orders,
  quoteStatusMeta,
  orderStatusMeta,
  getCustomer,
} from "@/data/mock";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/_app/bao-gia")({
  head: () => ({
    meta: [{ title: "Báo giá & Đơn hàng — Gạch Việt CRM" }],
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const [tab, setTab] = useState<"quotes" | "orders">("quotes");

  return (
    <>
      <PageHeader
        title="Báo giá & Đơn hàng"
        description="Quản lý báo giá đã gửi và đơn hàng đang xử lý cho các dự án."
        actions={
          <div className="flex gap-1 p-1 bg-surface-strong/70 rounded-lg ring-1 ring-black/5">
            <button
              onClick={() => setTab("quotes")}
              className={
                tab === "quotes"
                  ? "px-3 py-1 text-xs font-medium bg-card rounded shadow-sm text-foreground"
                  : "px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              Báo giá ({quotes.length})
            </button>
            <button
              onClick={() => setTab("orders")}
              className={
                tab === "orders"
                  ? "px-3 py-1 text-xs font-medium bg-card rounded shadow-sm text-foreground"
                  : "px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              Đơn hàng ({orders.length})
            </button>
          </div>
        }
      />

      <div className="bg-card ring-1 ring-black/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-strong/40">
              <th className="px-5 py-3 font-medium">Mã</th>
              <th className="px-5 py-3 font-medium">Khách hàng</th>
              <th className="px-5 py-3 font-medium">Dự án</th>
              <th className="px-5 py-3 font-medium">Ngày</th>
              <th className="px-5 py-3 font-medium text-right">Giá trị</th>
              <th className="px-5 py-3 font-medium">SL mã</th>
              <th className="px-5 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tab === "quotes"
              ? quotes.map((q) => {
                  const c = getCustomer(q.customerId);
                  const meta = quoteStatusMeta[q.status];
                  return (
                    <tr key={q.id} className="hover:bg-surface-strong/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-foreground">
                        {q.id}
                      </td>
                      <td className="px-5 py-3 text-foreground">{c.name}</td>
                      <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">
                        {c.project}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {q.createdAt}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-foreground">
                        {formatVND(q.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {q.itemsCount}
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
                })
              : orders.map((o) => {
                  const c = getCustomer(o.customerId);
                  const meta = orderStatusMeta[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-surface-strong/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-foreground">
                        {o.id}
                      </td>
                      <td className="px-5 py-3 text-foreground">{c.name}</td>
                      <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">
                        {c.project}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {o.createdAt}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-foreground">
                        {formatVND(o.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {o.itemsCount}
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
