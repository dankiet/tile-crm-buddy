import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/ProductImage";
import { updateProductFn } from "@/api/functions";
import type { Product } from "@/lib/types";
import { PRODUCT_COLORS } from "@/lib/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onEditImages?: () => void;
};

export function EditProductDialog({
  open,
  onOpenChange,
  product,
  onEditImages,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    internal_code: "",
    name: "",
    size: "",
    material: "",
    category: "",
    section: "",
    collection: "",
    color: "",
    stock_m2: "",
    retail_price: "",
    discount_tp: "",
    discount_b2b: "",
    note: "",
    is_hot: false,
    image_path: "",
  });

  useEffect(() => {
    if (!product || !open) return;
    setForm({
      code: product.code,
      internal_code: product.internal_code || "",
      name: product.name,
      size: product.size,
      material: product.material,
      category: product.category,
      section: product.section,
      collection: product.collection || product.section || "",
      color: product.color || "",
      stock_m2:
        product.stock_m2 != null && product.stock_m2 !== undefined
          ? String(product.stock_m2)
          : "",
      retail_price: String(product.retail_price),
      discount_tp:
        product.discount_tp != null ? String(product.discount_tp) : "",
      discount_b2b:
        product.discount_b2b != null ? String(product.discount_b2b) : "",
      note: product.note,
      is_hot: Boolean(product.is_hot),
      image_path: product.image_path || "",
    });
  }, [product, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const price = Number(form.retail_price.replace(/\D/g, ""));
    if (!form.code.trim()) {
      toast.error("Mã sản phẩm bắt buộc");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Giá bán lẻ không hợp lệ");
      return;
    }
    const stockRaw = form.stock_m2.trim().replace(",", ".");
    let stock_m2: number | null = null;
    if (stockRaw !== "") {
      stock_m2 = Number(stockRaw);
      if (Number.isNaN(stock_m2) || stock_m2 < 0) {
        toast.error("Tồn kho (m²) không hợp lệ");
        return;
      }
    }
    setSaving(true);
    try {
      await updateProductFn({
        data: {
          id: product.id,
          code: form.code.trim(),
          internal_code: form.internal_code.trim(),
          name: form.name.trim(),
          size: form.size.trim(),
          material: form.material.trim(),
          category: form.category.trim(),
          section: form.section.trim(),
          collection: form.collection.trim(),
          color: form.color.trim(),
          stock_m2,
          retail_price: price,
          discount_tp: form.discount_tp
            ? Number(form.discount_tp)
            : null,
          discount_b2b: form.discount_b2b
            ? Number(form.discount_b2b)
            : null,
          note: form.note.trim(),
          is_hot: form.is_hot ? 1 : 0,
          image_path: form.image_path.trim(),
        },
      });
      toast.success("Đã cập nhật sản phẩm");
      onOpenChange(false);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa sản phẩm</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="size-20 rounded-lg overflow-hidden ring-1 ring-black/5 bg-white">
                <ProductImage
                  src={form.image_path}
                  code={form.code}
                  fit="contain"
                />
              </div>
              {onEditImages ? (
                <button
                  type="button"
                  onClick={onEditImages}
                  className="text-[10px] font-medium text-terracotta hover:underline"
                >
                  Sửa hình
                  {product?.image_count
                    ? ` (${product.image_count})`
                    : ""}
                </button>
              ) : null}
            </div>
            <div className="flex-1 space-y-2">
              <Field label="Mã báo giá *">
                <input
                  className={inputCls}
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                />
              </Field>
              <Field label="Mã nội bộ (HHDV)">
                <input
                  className={inputCls}
                  value={form.internal_code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, internal_code: e.target.value }))
                  }
                  placeholder="Mã NXT / kế toán"
                />
              </Field>
              <Field label="Tên *">
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kích thước">
              <input
                className={inputCls}
                value={form.size}
                onChange={(e) =>
                  setForm((f) => ({ ...f, size: e.target.value }))
                }
              />
            </Field>
            <Field label="Chất liệu">
              <input
                className={inputCls}
                value={form.material}
                onChange={(e) =>
                  setForm((f) => ({ ...f, material: e.target.value }))
                }
              />
            </Field>
            <Field label="Danh mục">
              <input
                className={inputCls}
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </Field>
            <Field label="Bộ sưu tập">
              <input
                className={inputCls}
                value={form.collection}
                onChange={(e) =>
                  setForm((f) => ({ ...f, collection: e.target.value }))
                }
              />
            </Field>
            <Field label="Màu sắc">
              <input
                className={inputCls}
                list="product-color-list"
                value={form.color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
                placeholder="Trắng, Xanh mint..."
              />
              <datalist id="product-color-list">
                {PRODUCT_COLORS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Giá bán lẻ (đ/m²) *">
              <input
                className={inputCls}
                value={form.retail_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, retail_price: e.target.value }))
                }
              />
            </Field>
            <Field label="Tồn kho (m²)">
              <input
                className={inputCls}
                inputMode="decimal"
                value={form.stock_m2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock_m2: e.target.value }))
                }
                placeholder="vd. 12.5"
              />
            </Field>
            <Field label="CK TP (%)">
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={form.discount_tp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_tp: e.target.value }))
                }
              />
            </Field>
            <Field label="CK B2B (%)">
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={form.discount_b2b}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_b2b: e.target.value }))
                }
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_hot}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_hot: e.target.checked }))
              }
            />
            Đánh dấu bán chạy
          </label>

          <Field label="Ghi chú">
            <textarea
              className={`${inputCls} min-h-[64px] resize-y`}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </Field>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-medium px-3 py-1.5 rounded ring-1 ring-black/5"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
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
  "w-full text-sm px-3 py-2 rounded-md bg-background ring-1 ring-black/10 outline-none focus:ring-terracotta/40 text-foreground";
