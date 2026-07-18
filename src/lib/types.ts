export type CustomerStatus =
  | "consulting"
  | "quoted"
  | "closed"
  | "delivering"
  | "done";

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired";
export type OrderStatus = "preparing" | "shipping" | "delivered";
export type DiscountType = "none" | "tp" | "b2b" | "custom";

export type ProductImageKind = "map" | "concept" | "other";

export const PRODUCT_IMAGE_KIND_META: Record<
  ProductImageKind,
  { label: string }
> = {
  map: { label: "Hình map" },
  concept: { label: "Concept / thực tế" },
  other: { label: "Khác" },
};

export type ProductImageRow = {
  id: number;
  product_id: number;
  path: string;
  kind: ProductImageKind;
  sort_order: number;
  is_primary: number;
  caption: string;
  created_at: string;
};

export type Product = {
  id: number;
  code: string;
  /** Mã nội bộ HHDV (NXT / kế toán) — map từ file Mapping_HHDV */
  internal_code: string;
  /** Tồn kho (m²) — map từ Stock.xlsx theo internal_code */
  stock_m2?: number | null;
  name: string;
  size: string;
  material: string;
  category: string;
  section: string;
  /** Bộ sưu tập */
  collection: string;
  /** Màu sắc (lọc) */
  color: string;
  /** Quy cách đóng gói hiển thị: "100 viên/1m2" */
  packing?: string;
  packing_m2?: number | null;
  packing_pcs?: number | null;
  retail_price: number;
  discount_tp: number | null;
  discount_b2b: number | null;
  note: string;
  is_hot: number;
  /** Ảnh đại diện (primary) — đồng bộ từ product_images */
  image_path: string;
  /** Số ảnh (optional, join) */
  image_count?: number;
};

/** Màu chuẩn để gợi ý / trích từ tên */
export const PRODUCT_COLORS = [
  "Trắng",
  "Đen",
  "Xám",
  "Kem",
  "Beige",
  "Nâu",
  "Vàng",
  "Cam",
  "Đỏ",
  "Hồng",
  "Xanh",
  "Xanh mint",
  "Xanh dương",
  "Xanh lá",
  "Tím",
  "Gold",
] as const;

/** Nguồn khách hàng / lead */
export type LeadSource = "Facebook" | "Zalo" | "Khác" | "";

export const LEAD_SOURCES: Exclude<LeadSource, "">[] = [
  "Facebook",
  "Zalo",
  "Khác",
];

export type Customer = {
  id: number;
  name: string;
  /** Nguồn khách hàng: Facebook | Zalo | Khác */
  source: string;
  phone: string;
  region: string;
  status: CustomerStatus;
  note: string;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: number;
  code: string;
  customer_id: number;
  status: QuoteStatus;
  notes: string;
  discount_type: DiscountType;
  created_at: string;
  updated_at: string;
  amount?: number;
  items_count?: number;
  customer_name?: string;
  customer_source?: string;
};

export type QuoteItem = {
  id: number;
  quote_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  size: string;
  quantity_m2: number;
  retail_price: number;
  discount_pct: number;
  unit_price: number;
  area: string;
  line_total: number;
};

export type Order = {
  id: number;
  code: string;
  customer_id: number;
  quote_id: number | null;
  amount: number;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_source?: string;
  paid_amount?: number;
};

export type Payment = {
  id: number;
  customer_id: number;
  order_id: number | null;
  amount: number;
  paid_at: string;
  note: string;
  created_at: string;
};

export type Note = {
  id: number;
  customer_id: number | null;
  author: string;
  content: string;
  created_at: string;
  customer_name?: string;
  customer_source?: string;
};

/** Công nợ cộng dồn theo khách hàng */
export type CustomerDebt = {
  customer_id: number;
  customer_name: string;
  source: string;
  phone: string;
  region: string;
  status: CustomerStatus;
  order_count: number;
  total_order_amount: number;
  total_paid: number;
  debt: number;
};

export type CustomerDebtDetail = CustomerDebt & {
  orders: Array<Order & { paid_amount: number }>;
  payments: Payment[];
};

export const statusMeta: Record<
  CustomerStatus,
  { label: string; className: string }
> = {
  consulting: {
    label: "Đang tư vấn",
    className: "bg-secondary text-muted-foreground",
  },
  quoted: { label: "Gửi báo giá", className: "bg-blue-50 text-blue-700" },
  closed: { label: "Đã chốt", className: "bg-moss-soft text-moss" },
  delivering: {
    label: "Đang giao",
    className: "bg-amber-50 text-amber-700",
  },
  done: { label: "Hoàn tất", className: "bg-stone-200 text-stone-600" },
};

export const quoteStatusMeta: Record<
  QuoteStatus,
  { label: string; className: string }
> = {
  draft: { label: "Nháp", className: "bg-stone-200 text-stone-700" },
  sent: { label: "Đã gửi", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Đã duyệt", className: "bg-moss-soft text-moss" },
  expired: { label: "Hết hạn", className: "bg-stone-200 text-stone-500" },
};

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  preparing: {
    label: "Đang soạn kho",
    className: "bg-amber-50 text-amber-700",
  },
  shipping: {
    label: "Đang vận chuyển",
    className: "bg-blue-50 text-blue-700",
  },
  delivered: { label: "Đã giao", className: "bg-moss-soft text-moss" },
};

/** Pipeline 3 cột: tư vấn → báo giá → chốt */
export const pipelineStages: { key: CustomerStatus; label: string }[] = [
  { key: "consulting", label: "Đang tư vấn" },
  { key: "quoted", label: "Gửi báo giá" },
  { key: "closed", label: "Đã chốt" },
];
