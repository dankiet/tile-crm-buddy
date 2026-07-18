import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchCustomers,
  fetchProducts,
  fetchQuote,
  saveQuote,
  updateQuoteFn,
  convertQuoteToOrder,
} from "@/api/functions";
import type {
  Customer,
  DiscountType,
  Product,
  Quote,
  QuoteStatus,
} from "@/lib/types";
import { quoteStatusMeta } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";

type Line = {
  key: string;
  product: Product | null;
  quantity_m2: number;
  discount_pct: number;
  area: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultCustomerId?: number;
  /** When set → edit existing quote */
  quoteId?: number | null;
};

export function NewQuoteDialog({
  open,
  onOpenChange,
  onCreated,
  defaultCustomerId,
  quoteId = null,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(quoteId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [quoteCode, setQuoteCode] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [productSearch, setProductSearch] = useState("");
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alsoCreateOrder, setAlsoCreateOrder] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoadingEdit(true);
      try {
        const [cs, ps] = await Promise.all([
          fetchCustomers(),
          fetchProducts({ data: { limit: 2000 } }),
        ]);
        setCustomers(cs);
        setProducts(ps);

        if (quoteId) {
          const detail = await fetchQuote({ data: { id: quoteId } });
          if (!detail) {
            toast.error("Không tìm thấy báo giá");
            onOpenChange(false);
            return;
          }
          const q = detail.quote as Quote;
          setQuoteCode(q.code);
          setCustomerId(q.customer_id);
          setDiscountType(q.discount_type);
          setStatus(q.status);
          setNotes(q.notes || "");
          setLocked(q.status === "accepted" || q.status === "expired");
          setAlsoCreateOrder(false);

          const productMap = new Map(ps.map((p) => [p.id, p]));
          const loadedLines: Line[] = detail.items.map((item) => {
            const product =
              productMap.get(item.product_id) ??
              ({
                id: item.product_id,
                code: item.product_code,
                name: item.product_name,
                size: item.size,
                material: "",
                category: "",
                section: "",
                collection: "",
                color: "",
                retail_price: item.retail_price,
                discount_tp: null,
                discount_b2b: null,
                note: "",
                is_hot: 0,
                image_path: "",
              } satisfies Product);
            return {
              key: Math.random().toString(36).slice(2),
              product,
              quantity_m2: item.quantity_m2,
              discount_pct: item.discount_pct,
              area: item.area,
            };
          });
          setLines(loadedLines.length ? loadedLines : [emptyLine()]);
        } else {
          setQuoteCode("");
          setCustomerId(defaultCustomerId ?? "");
          setDiscountType("none");
          setStatus("draft");
          setNotes("");
          setLines([emptyLine()]);
          setAlsoCreateOrder(false);
          setLocked(false);
        }
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [open, defaultCustomerId, quoteId, onOpenChange]);

  function applyDiscountType(type: DiscountType, current: Line[]): Line[] {
    return current.map((line) => {
      if (!line.product) return line;
      let pct = 0;
      if (type === "tp") pct = line.product.discount_tp ?? 0;
      else if (type === "b2b") pct = line.product.discount_b2b ?? 0;
      else if (type === "none") pct = 0;
      else pct = line.discount_pct;
      return { ...line, discount_pct: pct };
    });
  }

  function setProductForLine(key: string, product: Product) {
    setLines((prev) => {
      const next = prev.map((l) => {
        if (l.key !== key) return l;
        let pct = l.discount_pct;
        if (discountType === "tp") pct = product.discount_tp ?? 0;
        else if (discountType === "b2b") pct = product.discount_b2b ?? 0;
        else if (discountType === "none") pct = 0;
        return { ...l, product, discount_pct: pct };
      });
      return next;
    });
    setActiveLineKey(null);
    setProductSearch("");
  }

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.size.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [products, productSearch]);

  const totals = useMemo(() => {
    let retail = 0;
    let after = 0;
    for (const l of lines) {
      if (!l.product || !l.quantity_m2) continue;
      const unit = Math.round(
        l.product.retail_price * (1 - (l.discount_pct || 0) / 100),
      );
      retail += l.product.retail_price * l.quantity_m2;
      after += unit * l.quantity_m2;
    }
    return { retail: Math.round(retail), after: Math.round(after) };
  }, [lines]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) {
      toast.error("Báo giá đã chốt/hết hạn — không thể sửa");
      return;
    }
    if (!customerId) {
      toast.error("Chọn khách hàng");
      return;
    }
    const items = lines
      .filter((l) => l.product && l.quantity_m2 > 0)
      .map((l) => ({
        product_id: l.product!.id,
        quantity_m2: l.quantity_m2,
        discount_pct: l.discount_pct,
        area: l.area,
      }));
    if (!items.length) {
      toast.error("Thêm ít nhất 1 sản phẩm với số lượng m²");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && quoteId) {
        const quote = await updateQuoteFn({
          data: {
            id: quoteId,
            customer_id: Number(customerId),
            discount_type: discountType,
            status,
            notes,
            items,
          },
        });
        if (alsoCreateOrder) {
          await convertQuoteToOrder({ data: { quoteId: quote.id } });
          toast.success(`Đã cập nhật ${quote.code} và tạo đơn hàng`);
        } else {
          toast.success(`Đã cập nhật báo giá ${quote.code}`);
        }
      } else {
        const quote = await saveQuote({
          data: {
            customer_id: Number(customerId),
            discount_type: discountType,
            notes,
            items,
          },
        });
        if (alsoCreateOrder) {
          await convertQuoteToOrder({ data: { quoteId: quote.id } });
          toast.success(`Đã tạo báo giá ${quote.code} và đơn hàng`);
        } else {
          toast.success(`Đã tạo báo giá ${quote.code}`);
        }
      }
      setLines([emptyLine()]);
      setNotes("");
      setAlsoCreateOrder(false);
      onOpenChange(false);
      onCreated?.();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu báo giá");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Sửa báo giá${quoteCode ? ` ${quoteCode}` : ""}`
              : "Tạo báo giá"}
          </DialogTitle>
        </DialogHeader>
        {loadingEdit ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Đang tải...
          </p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {locked && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              Báo giá đã duyệt hoặc hết hạn — chỉ xem, không chỉnh sửa.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Khách hàng *
              </span>
              <select
                className={inputCls}
                value={customerId}
                disabled={locked}
                onChange={(e) =>
                  setCustomerId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">— Chọn khách hàng —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.source ? ` · ${c.source}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Căn cứ chiết khấu
              </span>
              <select
                className={inputCls}
                value={discountType}
                disabled={locked}
                onChange={(e) => {
                  const t = e.target.value as DiscountType;
                  setDiscountType(t);
                  setLines((prev) => applyDiscountType(t, prev));
                }}
              >
                <option value="none">Giá bán lẻ (không CK)</option>
                <option value="tp">CK TP (Trade)</option>
                <option value="b2b">CK B2B (Partner)</option>
                <option value="custom">Tuỳ chỉnh từng dòng</option>
              </select>
            </label>
            {isEdit && (
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Trạng thái báo giá
                </span>
                <select
                  className={inputCls}
                  value={status}
                  disabled={locked}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                >
                  {(Object.keys(quoteStatusMeta) as QuoteStatus[]).map((k) => (
                    <option key={k} value={k}>
                      {quoteStatusMeta[k].label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Sản phẩm (giá bán lẻ + chiết khấu)
              </span>
              <button
                type="button"
                onClick={() => setLines((p) => [...p, emptyLine()])}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:opacity-80"
              >
                <Plus className="size-3.5" /> Thêm dòng
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => {
                const unit = line.product
                  ? Math.round(
                      line.product.retail_price *
                        (1 - (line.discount_pct || 0) / 100),
                    )
                  : 0;
                const lineTotal = Math.round(unit * (line.quantity_m2 || 0));
                return (
                  <div
                    key={line.key}
                    className="rounded-lg ring-1 ring-black/5 bg-surface-strong/30 p-3 space-y-2"
                  >
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          className={`${inputCls} text-left flex items-center gap-2`}
                          onClick={() =>
                            setActiveLineKey(
                              activeLineKey === line.key ? null : line.key,
                            )
                          }
                        >
                          <span className="size-7 rounded overflow-hidden flex-shrink-0 bg-white">
                            <ProductImage
                              src={line.product?.image_path}
                              className="size-7"
                              fit="contain"
                              placeholderClassName="text-[8px] gap-0.5 [&>div>svg]:size-3"
                            />
                          </span>
                          <span className="truncate">
                            {line.product
                              ? `${line.product.code} — ${line.product.name}`
                              : "Chọn sản phẩm..."}
                          </span>
                        </button>
                        {activeLineKey === line.key && (
                          <div className="absolute z-20 mt-1 w-full bg-card ring-1 ring-black/10 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-border flex items-center gap-2">
                              <Search className="size-3.5 text-muted-foreground" />
                              <input
                                autoFocus
                                className="flex-1 text-sm outline-none bg-transparent"
                                placeholder="Tìm mã / tên / size..."
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                              />
                            </div>
                            <div className="overflow-y-auto">
                              {filteredProducts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-surface-strong/60 flex gap-2 items-center"
                                  onClick={() => setProductForLine(line.key, p)}
                                >
                                  <span className="size-8 rounded overflow-hidden flex-shrink-0 bg-white">
                                    <ProductImage
                                      src={p.image_path}
                                      className="size-8"
                                      fit="contain"
                                      placeholderClassName="text-[8px] gap-0 [&>div>svg]:size-3.5 [&>div>span]:hidden"
                                    />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">
                                      {p.code} · {p.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {p.size} · {formatVND(p.retail_price)}/m²
                                      {p.discount_tp != null
                                        ? ` · CK TP ${p.discount_tp}%`
                                        : ""}
                                    </p>
                                  </div>
                                </button>
                              ))}
                              {!filteredProducts.length && (
                                <p className="p-3 text-xs text-muted-foreground">
                                  Không tìm thấy sản phẩm
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length === 1
                              ? [emptyLine()]
                              : prev.filter((l) => l.key !== line.key),
                          )
                        }
                        className="size-9 grid place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">
                          Số lượng (m²)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          className={inputCls}
                          value={line.quantity_m2 || ""}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? {
                                      ...l,
                                      quantity_m2: Number(e.target.value) || 0,
                                    }
                                  : l,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">
                          CK %
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          className={inputCls}
                          value={line.discount_pct || 0}
                          disabled={discountType !== "custom"}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? {
                                      ...l,
                                      discount_pct:
                                        Number(e.target.value) || 0,
                                    }
                                  : l,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">
                          Đơn giá sau CK
                        </span>
                        <div className={`${inputCls} bg-surface-strong/50`}>
                          {line.product ? formatVND(unit) : "—"}
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">
                          Thành tiền
                        </span>
                        <div
                          className={`${inputCls} bg-surface-strong/50 font-medium`}
                        >
                          {line.product && line.quantity_m2
                            ? formatVND(lineTotal)
                            : "—"}
                        </div>
                      </label>
                    </div>
                    {line.product && (
                      <p className="text-[10px] text-muted-foreground">
                        Giá lẻ: {formatVND(line.product.retail_price)}/m²
                        {line.product.discount_tp != null &&
                          ` · CK TP: ${line.product.discount_tp}%`}
                        {line.product.discount_b2b != null &&
                          ` · CK B2B: ${line.product.discount_b2b}%`}
                      </p>
                    )}
                    <input
                      className={inputCls}
                      placeholder="Khu vực áp dụng (phòng khách, WC...)"
                      value={line.area}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, area: e.target.value }
                              : l,
                          ),
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Ghi chú báo giá
            </span>
            <textarea
              className={`${inputCls} min-h-[64px] resize-y mt-1`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Tổng sau chiết khấu
              </p>
              <p className="text-xl font-medium text-foreground">
                {formatVND(totals.after)}
              </p>
              {totals.retail > totals.after && (
                <p className="text-[11px] text-muted-foreground line-through">
                  {formatVND(totals.retail)}
                </p>
              )}
            </div>
            {!locked && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={alsoCreateOrder}
                  onChange={(e) => setAlsoCreateOrder(e.target.checked)}
                />
                Tạo đơn hàng ngay (ghi nhận công nợ)
              </label>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-medium px-3 py-1.5 rounded ring-1 ring-black/5 bg-card hover:bg-surface-strong"
            >
              {locked ? "Đóng" : "Huỷ"}
            </button>
            {!locked && (
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : isEdit
                    ? "Lưu thay đổi"
                    : "Lưu báo giá"}
              </button>
            )}
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function emptyLine(): Line {
  return {
    key: Math.random().toString(36).slice(2),
    product: null,
    quantity_m2: 0,
    discount_pct: 0,
    area: "",
  };
}

const inputCls =
  "w-full text-sm px-3 py-2 rounded-md bg-background ring-1 ring-black/10 outline-none focus:ring-terracotta/40 text-foreground placeholder:text-muted-foreground/70 disabled:opacity-60";
