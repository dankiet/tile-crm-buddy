import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { fetchCustomers, fetchNotes, saveNote } from "@/api/functions";
import type { Customer, Note } from "@/lib/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/ghi-chu")({
  head: () => ({
    meta: [{ title: "Ghi chú — Innomat CRM" }],
  }),
  loader: async () => {
    const [notes, customers] = await Promise.all([
      fetchNotes({ data: { limit: 100 } }),
      fetchCustomers({ data: { status: "all" } }),
    ]);
    return { notes, customers };
  },
  component: NotesPage,
});

function NotesPage() {
  const { notes, customers } = Route.useLoaderData() as {
    notes: Note[];
    customers: Customer[];
  };
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Nhập nội dung ghi chú");
      return;
    }
    setSaving(true);
    try {
      await saveNote({
        data: {
          content,
          customer_id: customerId === "" ? null : Number(customerId),
        },
      });
      toast.success("Đã thêm ghi chú");
      setContent("");
      setCustomerId("");
      setOpen(false);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu ghi chú");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ghi chú & Hoạt động"
        description="Nhật ký trao đổi, phản hồi và điều chỉnh yêu cầu từ khách hàng."
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm"
          >
            + Ghi chú mới
          </button>
        }
      />

      <div className="bg-card ring-1 ring-black/5 rounded-xl overflow-hidden max-w-4xl">
        {notes.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">
            Chưa có ghi chú. Thêm ghi chú để theo dõi hoạt động bán hàng.
          </p>
        ) : (
          notes.map((n, idx) => (
            <div
              key={n.id}
              className={
                idx === 0
                  ? "flex gap-5 p-5"
                  : "flex gap-5 p-5 border-t border-border"
              }
            >
              <div className="size-9 rounded-full bg-surface-strong grid place-items-center text-xs font-medium text-foreground flex-shrink-0 ring-1 ring-black/5">
                {(n.author || "S")
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
                  {n.customer_name ? (
                    <span className="text-xs text-muted-foreground">
                      → {n.customer_name}
                      {n.customer_source ? ` · ${n.customer_source}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {n.content}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {n.created_at}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi chú mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Khách hàng (tuỳ chọn)
              </span>
              <select
                className="mt-1 w-full text-sm px-3 py-2 rounded-md bg-background ring-1 ring-black/10 outline-none"
                value={customerId}
                onChange={(e) =>
                  setCustomerId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">— Không gắn KH —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.source ? ` · ${c.source}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Nội dung *
              </span>
              <textarea
                className="mt-1 w-full text-sm px-3 py-2 rounded-md bg-background ring-1 ring-black/10 outline-none min-h-[100px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />
            </label>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium px-3 py-1.5 rounded ring-1 ring-black/5"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
