import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewCustomerDialog } from "@/components/NewCustomerDialog";
import { fetchCustomers } from "@/api/functions";
import { pipelineStages, type Customer } from "@/lib/types";

export const Route = createFileRoute("/_app/co-hoi")({
  head: () => ({
    meta: [{ title: "Cơ hội — Innomat CRM" }],
  }),
  loader: async (): Promise<{ customers: Customer[] }> => {
    const customers = await fetchCustomers({ data: { status: "all" } });
    return { customers };
  },
  component: PipelinePage,
});

function DealCard({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: () => void;
}) {
  const initial = customer.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-card ring-1 ring-black/5 rounded-lg p-3 hover:ring-stone-300 transition-all"
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div className="size-9 rounded bg-surface-strong grid place-items-center text-xs font-medium ring-1 ring-black/5 flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {customer.name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {customer.source
              ? `Nguồn: ${customer.source}`
              : "Chưa có nguồn"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {customer.region || "—"}
        </span>
        <span className="text-[10px] text-terracotta font-medium">Sửa</span>
      </div>
    </button>
  );
}

function PipelinePage() {
  const { customers } = Route.useLoaderData() as { customers: Customer[] };
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  return (
    <>
      <PageHeader
        title="Pipeline cơ hội"
        description="3 giai đoạn: tư vấn → báo giá → chốt. Bấm lead để sửa."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipelineStages.map((stage) => {
          const deals = customers.filter((c) => c.status === stage.key);
          return (
            <div
              key={stage.key}
              className="flex flex-col min-h-[320px] bg-surface-strong/40 rounded-xl ring-1 ring-black/5"
            >
              <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-tight text-foreground">
                    {stage.label}
                  </span>
                  <span className="size-5 flex items-center justify-center bg-card text-[10px] font-bold rounded-full ring-1 ring-black/5">
                    {deals.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-2 min-h-[300px]">
                {deals.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-8">
                    Chưa có cơ hội
                  </p>
                ) : (
                  deals.map((c) => (
                    <DealCard
                      key={c.id}
                      customer={c}
                      onEdit={() => setEditCustomer(c)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
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
