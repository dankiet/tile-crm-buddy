import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewQuoteDialog } from "@/components/NewQuoteDialog";
import {
  convertQuoteToOrder,
  exportQuoteXlsxFn,
  fetchOrders,
  fetchQuotes,
} from "@/api/functions";
import {
  orderStatusMeta,
  quoteStatusMeta,
  type Order,
  type Quote,
} from "@/lib/types";
import { formatVND } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bao-gia")({
  head: () => ({
    meta: [{ title: "Báo giá & Đơn hàng — Innomat CRM" }],
  }),
  loader: async () => {
    const [quotes, orders] = await Promise.all([
      fetchQuotes(),
      fetchOrders(),
    ]);
    return { quotes, orders };
  },
  component: QuotesPage,
});

function QuotesPage() {
  const { quotes, orders } = Route.useLoaderData() as {
    quotes: Quote[];
    orders: Order[];
  };
  const router = useRouter();
  const [tab, setTab] = useState<"quotes" | "orders">("quotes");
  const [editQuoteId, setEditQuoteId] = useState<number | null>(null);
  const [converting, setConverting] = useState<number | null>(null);
  const [printing, setPrinting] = useState<number | null>(null);

  async function handleConvert(q: Quote) {
    if (converting) return;
    setConverting(q.id);
    try {
      const order = await convertQuoteToOrder({ data: { quoteId: q.id } });
      toast.success(`Đã tạo đơn ${order.code} từ ${q.code}`);
      await router.invalidate();
      setTab("orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được đơn");
    } finally {
      setConverting(null);
    }
  }

  async function handlePrint(q: Quote) {
    if (printing) return;
    setPrinting(q.id);
    try {
      const file = await exportQuoteXlsxFn({ data: { quoteId: q.id } });
      const bin = atob(file.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${file.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xuất được PDF");
    } finally {
      setPrinting(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Báo giá & Đơn hàng"
        description="Báo giá theo giá bán lẻ + chiết khấu (CK TP / CK B2B). Đơn hàng ghi nhận công nợ."
        actions={
          <div className="flex gap-1 p-1 bg-surface-strong/70 rounded-lg ring-1 ring-black/5">
            <button
              type="button"
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
              type="button"
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
        {tab === "quotes" ? (
          quotes.length === 0 ? (
            <Empty text="Chưa có báo giá. Dùng nút «Tạo báo giá» trên thanh trên cùng." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-strong/40">
                  <th className="px-5 py-3 font-medium">Mã</th>
                  <th className="px-5 py-3 font-medium">Khách hàng</th>
                  <th className="px-5 py-3 font-medium">Nguồn KH</th>
                  <th className="px-5 py-3 font-medium">Ngày</th>
                  <th className="px-5 py-3 font-medium text-right">Giá trị</th>
                  <th className="px-5 py-3 font-medium">SL mã</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q) => (
                  <QuoteRow
                    key={q.id}
                    q={q}
                    converting={converting === q.id}
                    printing={printing === q.id}
                    onConvert={() => handleConvert(q)}
                    onEdit={() => setEditQuoteId(q.id)}
                    onPrint={() => handlePrint(q)}
                  />
                ))}
              </tbody>
            </table>
          )
        ) : orders.length === 0 ? (
          <Empty text="Chưa có đơn hàng. Chuyển báo giá thành đơn để ghi nhận công nợ." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-strong/40">
                <th className="px-5 py-3 font-medium">Mã</th>
                <th className="px-5 py-3 font-medium">Khách hàng</th>
                <th className="px-5 py-3 font-medium">Nguồn KH</th>
                <th className="px-5 py-3 font-medium">Ngày</th>
                <th className="px-5 py-3 font-medium text-right">Giá trị</th>
                <th className="px-5 py-3 font-medium text-right">Đã thu</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <OrderRow key={o.id} o={o} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewQuoteDialog
        open={editQuoteId != null}
        quoteId={editQuoteId}
        onOpenChange={(o) => {
          if (!o) setEditQuoteId(null);
        }}
      />
    </>
  );
}

function QuoteRow({
  q,
  converting,
  printing,
  onConvert,
  onEdit,
  onPrint,
}: {
  q: Quote;
  converting: boolean;
  printing: boolean;
  onConvert: () => void;
  onEdit: () => void;
  onPrint: () => void;
}) {
  const meta = quoteStatusMeta[q.status];
  return (
    <tr className="hover:bg-surface-strong/30 transition-colors">
      <td className="px-5 py-3 font-mono text-[11px] text-foreground">
        <button
          type="button"
          onClick={onEdit}
          className="hover:underline text-left"
        >
          {q.code}
        </button>
      </td>
      <td className="px-5 py-3 text-foreground">{q.customer_name}</td>
      <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">
        {q.customer_source || "—"}
      </td>
      <td className="px-5 py-3 text-muted-foreground">{q.created_at}</td>
      <td className="px-5 py-3 text-right font-medium text-foreground">
        {formatVND(q.amount ?? 0)}
      </td>
      <td className="px-5 py-3 text-muted-foreground">{q.items_count ?? 0}</td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.className}`}
        >
          {meta.label}
        </span>
      </td>
      <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-medium text-foreground hover:underline"
        >
          Sửa
        </button>
        <button
          type="button"
          disabled={printing}
          onClick={onPrint}
          className="text-[11px] font-medium text-moss hover:underline disabled:opacity-50"
        >
          {printing ? "..." : "In PDF"}
        </button>
        {q.status !== "accepted" && q.status !== "expired" ? (
          <button
            type="button"
            disabled={converting}
            onClick={onConvert}
            className="text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
          >
            {converting ? "..." : "→ Đơn hàng"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function OrderRow({ o }: { o: Order }) {
  const meta = orderStatusMeta[o.status];
  return (
    <tr className="hover:bg-surface-strong/30 transition-colors">
      <td className="px-5 py-3 font-mono text-[11px] text-foreground">
        {o.code}
      </td>
      <td className="px-5 py-3 text-foreground">{o.customer_name}</td>
      <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">
        {o.customer_source || "—"}
      </td>
      <td className="px-5 py-3 text-muted-foreground">{o.created_at}</td>
      <td className="px-5 py-3 text-right font-medium text-foreground">
        {formatVND(o.amount)}
      </td>
      <td className="px-5 py-3 text-right text-moss">
        {formatVND(o.paid_amount ?? 0)}
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
}

function Empty({
  text,
  action,
  actionLabel,
}: {
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="p-12 text-center">
      <p className="text-sm text-muted-foreground mb-4">{text}</p>
      {action && actionLabel ? (
        <button
          type="button"
          onClick={action}
          className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
