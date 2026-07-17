import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  customers,
  pipelineStages,
  getTile,
  type Customer,
} from "@/data/mock";
import { formatVNDShort } from "@/lib/format";

export const Route = createFileRoute("/_app/co-hoi")({
  head: () => ({
    meta: [{ title: "Cơ hội — Gạch Việt CRM" }],
  }),
  component: PipelinePage,
});

function DealCard({ customer }: { customer: Customer }) {
  const firstTile = getTile(customer.tiles[0].tileId);
  return (
    <div className="bg-card ring-1 ring-black/5 rounded-lg p-3 hover:ring-stone-300 transition-all cursor-pointer">
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="size-9 rounded bg-cover bg-center outline outline-1 -outline-offset-1 outline-black/5 flex-shrink-0"
          style={{ backgroundImage: `url(${firstTile.image})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {customer.name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {customer.project}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {customer.region}
        </span>
        <span className="text-[11px] font-medium text-foreground">
          {formatVNDShort(customer.dealValue)}
        </span>
      </div>
    </div>
  );
}

function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline cơ hội"
        description="Kéo thả cơ hội qua các giai đoạn để cập nhật tiến độ dự án."
      />

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8">
        {pipelineStages.map((stage) => {
          const deals = customers.filter((c) => c.status === stage.key);
          const totalValue = deals.reduce((s, c) => s + c.dealValue, 0);
          return (
            <div
              key={stage.key}
              className="w-72 flex-shrink-0 flex flex-col bg-surface-strong/40 rounded-xl ring-1 ring-black/5"
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
                <span className="text-[10px] text-muted-foreground">
                  {formatVNDShort(totalValue)}
                </span>
              </div>
              <div className="flex-1 p-3 space-y-2 min-h-[300px]">
                {deals.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-8">
                    Chưa có cơ hội
                  </p>
                ) : (
                  deals.map((c) => <DealCard key={c.id} customer={c} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
