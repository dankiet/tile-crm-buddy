/**
 * Client-callable RPC functions (createServerFn).
 * DB logic lives in *.server.ts and is only used inside handlers.
 */
import { createServerFn } from "@tanstack/react-start";
import type {
  CustomerStatus,
  DiscountType,
  OrderStatus,
  ProductImageKind,
  QuoteStatus,
} from "@/lib/types";

export const fetchProducts = createServerFn({ method: "GET" })
  .inputValidator(
    (data?: { category?: string; search?: string; limit?: number }) => data,
  )
  .handler(async ({ data }) => {
    const { listProducts } = await import("@/db/crm.server");
    return listProducts(data);
  });

export const fetchCategories = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listCategories } = await import("@/db/crm.server");
    return listCategories();
  },
);

export const fetchProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const { getProduct } = await import("@/db/crm.server");
    return getProduct(data.id);
  });

export const fetchSections = createServerFn({ method: "GET" })
  .inputValidator((data?: { category?: string }) => data)
  .handler(async ({ data }) => {
    const { listSections } = await import("@/db/crm.server");
    return listSections(data?.category);
  });

export const updateProductFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      code?: string;
      internal_code?: string;
      name?: string;
      size?: string;
      material?: string;
      category?: string;
      section?: string;
      collection?: string;
      color?: string;
      stock_m2?: number | null;
      retail_price?: number;
      discount_tp?: number | null;
      discount_b2b?: number | null;
      note?: string;
      is_hot?: number;
      image_path?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateProduct } = await import("@/db/crm.server");
    const { id, ...rest } = data;
    return updateProduct(id, rest);
  });

export const fetchProductImages = createServerFn({ method: "GET" })
  .inputValidator((data: { productId: number }) => data)
  .handler(async ({ data }) => {
    const { listProductImages } = await import("@/db/crm.server");
    return listProductImages(data.productId);
  });

export const uploadProductImageFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      product_id: number;
      filename: string;
      dataBase64: string;
      mimeType?: string;
      kind?: ProductImageKind;
      caption?: string;
      is_primary?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { uploadProductImageFile } = await import("@/db/crm.server");
    return uploadProductImageFile(data);
  });

export const addProductImageByPathFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      product_id: number;
      path: string;
      kind?: ProductImageKind;
      caption?: string;
      is_primary?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { addProductImage } = await import("@/db/crm.server");
    return addProductImage(data);
  });

export const updateProductImageFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      kind?: ProductImageKind;
      caption?: string;
      sort_order?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateProductImage } = await import("@/db/crm.server");
    const { id, ...rest } = data;
    return updateProductImage(id, rest);
  });

export const setPrimaryProductImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: number; imageId: number }) => data)
  .handler(async ({ data }) => {
    const { setPrimaryProductImage } = await import("@/db/crm.server");
    return setPrimaryProductImage(data.productId, data.imageId);
  });

export const deleteProductImageFn = createServerFn({ method: "POST" })
  .inputValidator((data: { imageId: number }) => data)
  .handler(async ({ data }) => {
    const { deleteProductImage } = await import("@/db/crm.server");
    return deleteProductImage(data.imageId);
  });

export const fetchCustomers = createServerFn({ method: "GET" })
  .inputValidator((data?: { status?: CustomerStatus | "all" }) => data)
  .handler(async ({ data }) => {
    const { listCustomers } = await import("@/db/crm.server");
    return listCustomers(data?.status);
  });

export const fetchCustomer = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const { getCustomer } = await import("@/db/crm.server");
    return getCustomer(data.id);
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      source?: string;
      phone?: string;
      region?: string;
      status?: CustomerStatus;
      note?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (!data.name?.trim()) throw new Error("Tên khách hàng bắt buộc");
    const { createCustomer } = await import("@/db/crm.server");
    return createCustomer(data);
  });

export const updateCustomerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      name?: string;
      source?: string;
      phone?: string;
      region?: string;
      status?: CustomerStatus;
      note?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateCustomer } = await import("@/db/crm.server");
    const { id, ...rest } = data;
    return updateCustomer(id, rest);
  });

export const setCustomerStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; status: CustomerStatus }) => data)
  .handler(async ({ data }) => {
    const { updateCustomerStatus } = await import("@/db/crm.server");
    return updateCustomerStatus(data.id, data.status);
  });

export const fetchQuotes = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listQuotes } = await import("@/db/crm.server");
    return listQuotes();
  },
);

export const fetchQuote = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const { getQuote, getQuoteItems } = await import("@/db/crm.server");
    const quote = getQuote(data.id);
    if (!quote) return null;
    return { quote, items: getQuoteItems(data.id) };
  });

export const fetchQuoteItems = createServerFn({ method: "GET" })
  .inputValidator((data: { quoteId: number }) => data)
  .handler(async ({ data }) => {
    const { getQuoteItems } = await import("@/db/crm.server");
    return getQuoteItems(data.quoteId);
  });

export const saveQuote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      customer_id: number;
      discount_type?: DiscountType;
      notes?: string;
      items: Array<{
        product_id: number;
        quantity_m2: number;
        discount_pct?: number;
        area?: string;
      }>;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { createQuote } = await import("@/db/crm.server");
    return createQuote(data);
  });

export const updateQuoteFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      customer_id: number;
      status?: QuoteStatus;
      discount_type?: DiscountType;
      notes?: string;
      items: Array<{
        product_id: number;
        quantity_m2: number;
        discount_pct?: number;
        area?: string;
      }>;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { updateQuote } = await import("@/db/crm.server");
    return updateQuote(data);
  });

export const setQuoteStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; status: QuoteStatus }) => data)
  .handler(async ({ data }) => {
    const { updateQuoteStatus } = await import("@/db/crm.server");
    updateQuoteStatus(data.id, data.status);
    return { ok: true as const };
  });

export const fetchOrders = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listOrders } = await import("@/db/crm.server");
    return listOrders();
  },
);

export const saveOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      customer_id: number;
      amount: number;
      quote_id?: number | null;
      status?: OrderStatus;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { createOrder } = await import("@/db/crm.server");
    return createOrder(data);
  });

export const convertQuoteToOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { quoteId: number }) => data)
  .handler(async ({ data }) => {
    const { createOrderFromQuote } = await import("@/db/crm.server");
    return createOrderFromQuote(data.quoteId);
  });

export const fetchCustomerDebts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listCustomerDebts } = await import("@/db/crm.server");
    return listCustomerDebts();
  },
);

export const fetchCustomerDebtDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { customerId: number }) => data)
  .handler(async ({ data }) => {
    const { getCustomerDebtDetail } = await import("@/db/crm.server");
    return getCustomerDebtDetail(data.customerId);
  });

export const savePayment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      customer_id: number;
      amount: number;
      order_id?: number | null;
      paid_at?: string;
      note?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { addPayment } = await import("@/db/crm.server");
    return addPayment(data);
  });

export const fetchNotes = createServerFn({ method: "GET" })
  .inputValidator((data?: { limit?: number }) => data)
  .handler(async ({ data }) => {
    const { listNotes } = await import("@/db/crm.server");
    return listNotes(data?.limit ?? 50);
  });

export const saveNote = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      content: string;
      customer_id?: number | null;
      author?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (!data.content?.trim()) throw new Error("Nội dung ghi chú bắt buộc");
    const { createNote } = await import("@/db/crm.server");
    return createNote(data);
  });

export const fetchDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getDashboardStats } = await import("@/db/crm.server");
    return getDashboardStats();
  },
);

/** Xuất báo giá PDF A4 (form Bao_Gia_Form_V2 + ảnh đại diện) */
export const exportQuoteXlsxFn = createServerFn({ method: "POST" })
  .inputValidator((data: { quoteId: number }) => data)
  .handler(async ({ data }) => {
    const { exportQuoteToPdf } = await import("@/db/export-quote.server");
    return exportQuoteToPdf(data.quoteId);
  });
