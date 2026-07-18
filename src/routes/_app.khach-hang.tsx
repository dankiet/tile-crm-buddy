import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CustomerCard } from "@/components/CustomerCard";
import { NewCustomerDialog } from "@/components/NewCustomerDialog";
import {
  fetchCustomerDebts,
  fetchCustomers,
  fetchNotes,
} from "@/api/functions";
import { statusMeta, type Customer, type CustomerStatus } from "@/lib/types";
import { formatVNDShort } from "@/lib/format";

export const Route = createFileRoute("/_app/khach-hang")({
  head: () => ({
    meta: [{ title: "Khách hàng — Innomat CRM" }],
  }),
  loader: async () => {
    const [customers, debts, notes] = await Promise.all([
      fetchCustomers({ data: { status: "all" } }),
      fetchCustomerDebts(),
      fetchNotes({ data: { limit: 8 } }),
    ]);
    return { customers, debts, notes };
  },
  component: CustomersPage,
});

const filters: { key: "all" | CustomerStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "consulting", label: "Đang tư vấn" },
  { key: "quoted", label: "Gửi báo giá" },
  { key: "closed", label: "Đã chốt" },
];

function CustomersPage() {
  const { customers, debts, notes } = Route.useLoaderData() as {
    customers: Customer[];
    debts: Array<{ customer_id: number; debt: number }>;
    notes: import("@/lib/types").Note[];
  };
  const [filter, setFilter] = useState<"all" | CustomerStatus>("all");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const debtMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of debts) m.set(d.customer_id, d.debt);
    return m;
  }, [debts]);

  const visible =
    filter === "all"
      ? customers
      : customers.filter((c) => c.status === filter);

  const quotedCount = customers.filter(
    (c) => c.status === "quoted" || c.status === "consulting",
  ).length;

  return (
    <>
      <PageHeader
        title="Danh mục khách hàng hiện tại"
        description={`Theo dõi tiến độ dự án của ${customers.length} khách hàng.`}
        actions={
          <div className="flex gap-1 p-1 bg-surface-strong/70 rounded-lg ring-1 ring-black/5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
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

      {visible.length === 0 ? (
        <div className="bg-card ring-1 ring-black/5 rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có khách hàng{filter !== "all" ? " ở trạng thái này" : ""}.
            Dùng nút &quot;+ Khách hàng mới&quot; trên thanh trên cùng.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              debt={debtMap.get(c.id) ?? 0}
              onEdit={() => setEditCustomer(c)}
            />
          ))}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Ghi chú hoạt động gần đây
          </h2>
          <div className="bg-card ring-1 ring-black/5 rounded-xl divide-y divide-border">
            {notes.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Chưa có ghi chú.
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-4 flex gap-4">
                  <div className="size-2 bg-stone-300 rounded-full mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.created_at} · {n.author}
                      {n.customer_name ? ` → ${n.customer_name}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Thống kê
          </h2>
          <div className="space-y-4">
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Đang tư vấn / báo giá
              </p>
              <p className="text-xl font-medium text-foreground">
                {quotedCount} khách
              </p>
            </div>
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Tổng công nợ phải thu
              </p>
              <p className="text-xl font-medium text-terracotta">
                {formatVNDShort(
                  debts.reduce((s, d) => s + Math.max(0, d.debt), 0),
                )}
              </p>
            </div>
            <div className="bg-card ring-1 ring-black/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Phân bố trạng thái
              </p>
              <div className="mt-2 space-y-1">
                {(
                  ["consulting", "quoted", "closed"] as CustomerStatus[]
                ).map((k) => {
                  const n = customers.filter((c) => c.status === k).length;
                  if (!n) return null;
                  return (
                    <div
                      key={k}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>{statusMeta[k].label}</span>
                      <span className="font-medium text-foreground">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewCustomerDialog
        open={Boolean(editCustomer)}
        onOpenChange={(o) => {
          if (!o) setEditCustomer(null);
        }}
        customer={editCustomer}
      />
    </>
  );
}
