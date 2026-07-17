import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { notes, getCustomer } from "@/data/mock";

export const Route = createFileRoute("/_app/ghi-chu")({
  head: () => ({
    meta: [{ title: "Ghi chú — Gạch Việt CRM" }],
  }),
  component: NotesPage,
});

function NotesPage() {
  return (
    <>
      <PageHeader
        title="Ghi chú & Hoạt động"
        description="Nhật ký các trao đổi, phản hồi và điều chỉnh yêu cầu từ khách hàng."
        actions={
          <button className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm">
            + Ghi chú mới
          </button>
        }
      />

      <div className="bg-card ring-1 ring-black/5 rounded-xl overflow-hidden max-w-4xl">
        {notes.map((n, idx) => {
          const c = getCustomer(n.customerId);
          return (
            <div
              key={n.id}
              className={
                idx === 0
                  ? "flex gap-5 p-5"
                  : "flex gap-5 p-5 border-t border-border"
              }
            >
              <div className="size-9 rounded-full bg-surface-strong grid place-items-center text-xs font-medium text-foreground flex-shrink-0 ring-1 ring-black/5">
                {n.author
                  .split(" ")
                  .map((w) => w[0])
                  .slice(-2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {n.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    → {c.name} · {c.project}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {n.content}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {n.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
