import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveCustomer, updateCustomerFn } from "@/api/functions";
import type { Customer, CustomerStatus, LeadSource } from "@/lib/types";
import { LEAD_SOURCES, pipelineStages, statusMeta } from "@/lib/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** When set → edit mode */
  customer?: Customer | null;
};

const emptyForm = {
  name: "",
  source: "" as LeadSource | string,
  phone: "",
  region: "",
  status: "consulting" as CustomerStatus,
  note: "",
};

export function NewCustomerDialog({
  open,
  onOpenChange,
  onCreated,
  customer = null,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(customer?.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setForm({
        name: customer.name,
        source: customer.source || "",
        phone: customer.phone,
        region: customer.region,
        status: customer.status,
        note: customer.note,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && customer) {
        await updateCustomerFn({
          data: { id: customer.id, ...form },
        });
        toast.success("Đã cập nhật khách hàng");
      } else {
        await saveCustomer({ data: form });
        toast.success("Đã thêm khách hàng mới");
      }
      onOpenChange(false);
      onCreated?.();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu khách hàng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa khách hàng / lead" : "Khách hàng mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Tên khách hàng *">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Anh/Chị hoặc tên công ty"
              autoFocus
            />
          </Field>
          <Field label="Nguồn khách hàng">
            <select
              className={inputCls}
              value={form.source}
              onChange={(e) =>
                setForm((f) => ({ ...f, source: e.target.value }))
              }
            >
              <option value="">— Chọn nguồn —</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Điện thoại">
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="09xx..."
              />
            </Field>
            <Field label="Khu vực">
              <input
                className={inputCls}
                value={form.region}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region: e.target.value }))
                }
                placeholder="TP.HCM, Hà Nội..."
              />
            </Field>
          </div>
          <Field label="Trạng thái (lead)">
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as CustomerStatus,
                }))
              }
            >
              {pipelineStages.map((s) => (
                <option key={s.key} value={s.key}>
                  {statusMeta[s.key].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea
              className={`${inputCls} min-h-[72px] resize-y`}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Nhu cầu, ghi chú thêm..."
            />
          </Field>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-medium px-3 py-1.5 rounded ring-1 ring-black/5 bg-card hover:bg-surface-strong"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : isEdit
                  ? "Lưu thay đổi"
                  : "Lưu khách hàng"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full text-sm px-3 py-2 rounded-md bg-background ring-1 ring-black/10 outline-none focus:ring-terracotta/40 text-foreground placeholder:text-muted-foreground/70";
