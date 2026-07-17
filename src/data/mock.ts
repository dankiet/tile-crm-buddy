import graniteBeige from "@/assets/tiles/granite-beige.jpg";
import ceramicWood from "@/assets/tiles/ceramic-wood.jpg";
import marbleCarrara from "@/assets/tiles/marble-carrara.jpg";
import mosaicGrey from "@/assets/tiles/mosaic-grey.jpg";
import terracotta from "@/assets/tiles/terracotta.jpg";
import handmadeGreen from "@/assets/tiles/handmade-green.jpg";
import porcelainMatte from "@/assets/tiles/porcelain-matte.jpg";

export type TileProduct = {
  id: string;
  code: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  image: string;
  category: "Granite" | "Ceramic" | "Marble" | "Mosaic" | "Terracotta" | "Porcelain" | "Handmade";
};

export const tiles: TileProduct[] = [
  { id: "t1", code: "GR-6060-BK", name: "Granite 60x60 Bóng Kiếng", size: "60x60cm", price: 420_000, stock: 1240, image: graniteBeige, category: "Granite" },
  { id: "t2", code: "CE-3060-GG", name: "Ceramic 30x60 giả gỗ", size: "30x60cm", price: 285_000, stock: 890, image: ceramicWood, category: "Ceramic" },
  { id: "t3", code: "MB-8080-CR", name: "Marble Carrara 80x80", size: "80x80cm", price: 890_000, stock: 340, image: marbleCarrara, category: "Marble" },
  { id: "t4", code: "MS-3030-DG", name: "Mosaic Dark Grey 30x30", size: "30x30cm", price: 520_000, stock: 210, image: mosaicGrey, category: "Mosaic" },
  { id: "t5", code: "TC-2020-HA", name: "Gạch gốm Terracotta Hội An", size: "20x20cm", price: 195_000, stock: 620, image: terracotta, category: "Terracotta" },
  { id: "t6", code: "HM-1030-GR", name: "Gạch thẻ Handmade Green", size: "10x30cm", price: 350_000, stock: 180, image: handmadeGreen, category: "Handmade" },
  { id: "t7", code: "PC-8080-MT", name: "Porcelain 80x80 Mờ", size: "80x80cm", price: 480_000, stock: 720, image: porcelainMatte, category: "Porcelain" },
];

export type CustomerStatus = "consulting" | "quoted" | "closed" | "delivering" | "done";

export const statusMeta: Record<
  CustomerStatus,
  { label: string; className: string }
> = {
  consulting: { label: "Đang tư vấn", className: "bg-secondary text-muted-foreground" },
  quoted: { label: "Gửi báo giá", className: "bg-blue-50 text-blue-700" },
  closed: { label: "Đã chốt", className: "bg-moss-soft text-moss" },
  delivering: { label: "Đang giao", className: "bg-amber-50 text-amber-700" },
  done: { label: "Hoàn tất", className: "bg-stone-200 text-stone-600" },
};

export type CustomerTile = {
  tileId: string;
  area: string; // khu vực trong dự án
  quantityM2: number;
};

export type Customer = {
  id: string;
  name: string;
  project: string;
  phone: string;
  region: string;
  status: CustomerStatus;
  dealValue: number;
  debt: number;
  updatedAt: string;
  tiles: CustomerTile[];
};

export const customers: Customer[] = [
  {
    id: "c1",
    name: "Anh Tuấn",
    project: "Biệt thự Vinhomes Riverside",
    phone: "0912 345 678",
    region: "Hà Nội",
    status: "closed",
    dealValue: 245_000_000,
    debt: 49_000_000,
    updatedAt: "Hôm nay, 14:30",
    tiles: [
      { tileId: "t1", area: "Sảnh chính + phòng khách", quantityM2: 120 },
      { tileId: "t2", area: "Sân vườn sau", quantityM2: 45 },
    ],
  },
  {
    id: "c2",
    name: "Chị Lan",
    project: "Penthouse Serenity Sky Villas",
    phone: "0908 112 233",
    region: "TP.HCM",
    status: "consulting",
    dealValue: 380_000_000,
    debt: 15_200_000,
    updatedAt: "Hôm nay, 10:15",
    tiles: [
      { tileId: "t3", area: "Phòng khách chính", quantityM2: 85 },
      { tileId: "t4", area: "Phòng tắm Master", quantityM2: 22 },
    ],
  },
  {
    id: "c3",
    name: "KTS Hoàng",
    project: "Dự án Boutique Homestay Hội An",
    phone: "0989 456 111",
    region: "Đà Nẵng",
    status: "quoted",
    dealValue: 480_000_000,
    debt: 0,
    updatedAt: "Hôm qua, 17:40",
    tiles: [
      { tileId: "t5", area: "Sân trong + lối đi", quantityM2: 210 },
      { tileId: "t6", area: "Quầy bar & mảng tường", quantityM2: 34 },
    ],
  },
  {
    id: "c4",
    name: "Cty An Gia",
    project: "Chung cư An Gia Skyline 5 block",
    phone: "028 3822 4455",
    region: "TP.HCM",
    status: "quoted",
    dealValue: 1_240_000_000,
    debt: 0,
    updatedAt: "Hôm qua, 09:00",
    tiles: [
      { tileId: "t7", area: "Hành lang & sảnh block A-E", quantityM2: 620 },
      { tileId: "t1", area: "Căn hộ mẫu (12 căn)", quantityM2: 480 },
    ],
  },
  {
    id: "c5",
    name: "Chị Mai",
    project: "Nhà phố Q7 Riverside",
    phone: "0937 552 010",
    region: "TP.HCM",
    status: "delivering",
    dealValue: 168_000_000,
    debt: 22_400_000,
    updatedAt: "Hôm nay, 08:20",
    tiles: [
      { tileId: "t2", area: "Toàn bộ tầng 1", quantityM2: 78 },
      { tileId: "t7", area: "Ban công + logia", quantityM2: 24 },
    ],
  },
  {
    id: "c6",
    name: "Anh Dũng",
    project: "Villa Đà Lạt Highlands",
    phone: "0918 001 234",
    region: "Lâm Đồng",
    status: "closed",
    dealValue: 320_000_000,
    debt: 0,
    updatedAt: "3 ngày trước",
    tiles: [
      { tileId: "t5", area: "Toàn bộ sân vườn", quantityM2: 180 },
      { tileId: "t3", area: "Phòng khách + phòng ngủ", quantityM2: 65 },
    ],
  },
  {
    id: "c7",
    name: "Nội thất Urban",
    project: "Showroom thời trang Q1",
    phone: "0902 776 543",
    region: "TP.HCM",
    status: "consulting",
    dealValue: 112_000_000,
    debt: 0,
    updatedAt: "Hôm nay, 09:45",
    tiles: [
      { tileId: "t6", area: "Mảng tường trang trí", quantityM2: 28 },
      { tileId: "t4", area: "Sàn khu thử đồ", quantityM2: 40 },
    ],
  },
  {
    id: "c8",
    name: "Chị Hạnh",
    project: "Căn hộ Masteri Thảo Điền",
    phone: "0945 223 887",
    region: "TP.HCM",
    status: "done",
    dealValue: 96_000_000,
    debt: 0,
    updatedAt: "1 tuần trước",
    tiles: [
      { tileId: "t3", area: "Phòng khách", quantityM2: 45 },
      { tileId: "t4", area: "Phòng tắm", quantityM2: 18 },
    ],
  },
  {
    id: "c9",
    name: "KTS An Nam",
    project: "Resort Phú Quốc — Villa mẫu",
    phone: "0976 145 200",
    region: "Kiên Giang",
    status: "delivering",
    dealValue: 890_000_000,
    debt: 45_200_000,
    updatedAt: "Hôm qua, 15:20",
    tiles: [
      { tileId: "t5", area: "Sân hồ bơi", quantityM2: 240 },
      { tileId: "t7", area: "Villa mẫu 4PN", quantityM2: 320 },
    ],
  },
  {
    id: "c10",
    name: "Cty Xây dựng Lê Gia",
    project: "Tổ hợp văn phòng Cầu Giấy",
    phone: "024 3556 8899",
    region: "Hà Nội",
    status: "quoted",
    dealValue: 1_580_000_000,
    debt: 128_000_000,
    updatedAt: "2 ngày trước",
    tiles: [
      { tileId: "t7", area: "Sàn văn phòng tầng 3-8", quantityM2: 1200 },
      { tileId: "t1", area: "Sảnh trung tâm", quantityM2: 210 },
    ],
  },
  {
    id: "c11",
    name: "Anh Phong",
    project: "Nhà phố Hải Phòng",
    phone: "0913 887 665",
    region: "Hải Phòng",
    status: "consulting",
    dealValue: 145_000_000,
    debt: 0,
    updatedAt: "Hôm nay, 11:00",
    tiles: [
      { tileId: "t2", area: "Sàn 3 tầng", quantityM2: 210 },
    ],
  },
  {
    id: "c12",
    name: "Chị Thu",
    project: "Cafe Terracotta — Q3",
    phone: "0908 445 221",
    region: "TP.HCM",
    status: "closed",
    dealValue: 78_000_000,
    debt: 12_000_000,
    updatedAt: "Hôm nay, 13:10",
    tiles: [
      { tileId: "t5", area: "Sàn toàn quán", quantityM2: 95 },
      { tileId: "t6", area: "Mảng tường quầy pha chế", quantityM2: 18 },
    ],
  },
];

export function getTile(id: string): TileProduct {
  return tiles.find((t) => t.id === id)!;
}

export type PipelineStage = {
  key: CustomerStatus;
  label: string;
};

export const pipelineStages: PipelineStage[] = [
  { key: "consulting", label: "Đang tư vấn" },
  { key: "quoted", label: "Gửi báo giá" },
  { key: "closed", label: "Đã chốt" },
  { key: "delivering", label: "Đang giao" },
  { key: "done", label: "Hoàn tất" },
];

export type Quote = {
  id: string;
  customerId: string;
  createdAt: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "expired";
  itemsCount: number;
};

export const quotes: Quote[] = [
  { id: "BG-2024-0552", customerId: "c4", createdAt: "12/05/2024", amount: 1_240_000_000, status: "sent", itemsCount: 8 },
  { id: "BG-2024-0551", customerId: "c3", createdAt: "12/05/2024", amount: 480_000_000, status: "sent", itemsCount: 5 },
  { id: "BG-2024-0548", customerId: "c10", createdAt: "10/05/2024", amount: 1_580_000_000, status: "sent", itemsCount: 12 },
  { id: "BG-2024-0545", customerId: "c2", createdAt: "09/05/2024", amount: 380_000_000, status: "draft", itemsCount: 4 },
  { id: "BG-2024-0540", customerId: "c1", createdAt: "05/05/2024", amount: 245_000_000, status: "accepted", itemsCount: 3 },
  { id: "BG-2024-0538", customerId: "c6", createdAt: "02/05/2024", amount: 320_000_000, status: "accepted", itemsCount: 4 },
  { id: "BG-2024-0530", customerId: "c8", createdAt: "20/04/2024", amount: 96_000_000, status: "expired", itemsCount: 2 },
];

export const quoteStatusMeta: Record<
  Quote["status"],
  { label: string; className: string }
> = {
  draft: { label: "Nháp", className: "bg-stone-200 text-stone-700" },
  sent: { label: "Đã gửi", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Đã duyệt", className: "bg-moss-soft text-moss" },
  expired: { label: "Hết hạn", className: "bg-stone-200 text-stone-500" },
};

export type Order = {
  id: string;
  customerId: string;
  createdAt: string;
  amount: number;
  status: "preparing" | "shipping" | "delivered";
  itemsCount: number;
};

export const orders: Order[] = [
  { id: "ĐH-2024-0221", customerId: "c1", createdAt: "10/05/2024", amount: 245_000_000, status: "delivered", itemsCount: 3 },
  { id: "ĐH-2024-0224", customerId: "c5", createdAt: "11/05/2024", amount: 168_000_000, status: "shipping", itemsCount: 2 },
  { id: "ĐH-2024-0226", customerId: "c9", createdAt: "13/05/2024", amount: 890_000_000, status: "shipping", itemsCount: 2 },
  { id: "ĐH-2024-0228", customerId: "c6", createdAt: "14/05/2024", amount: 320_000_000, status: "preparing", itemsCount: 2 },
  { id: "ĐH-2024-0230", customerId: "c12", createdAt: "14/05/2024", amount: 78_000_000, status: "preparing", itemsCount: 2 },
];

export const orderStatusMeta: Record<
  Order["status"],
  { label: string; className: string }
> = {
  preparing: { label: "Đang soạn kho", className: "bg-amber-50 text-amber-700" },
  shipping: { label: "Đang vận chuyển", className: "bg-blue-50 text-blue-700" },
  delivered: { label: "Đã giao", className: "bg-moss-soft text-moss" },
};

export type Note = {
  id: string;
  customerId: string;
  author: string;
  time: string;
  content: string;
};

export const notes: Note[] = [
  { id: "n1", customerId: "c1", author: "Minh Hoàng", time: "Hôm nay, 14:30", content: "Đã gửi mẫu Granite 60x60 cho Anh Tuấn kiểm tra độ nhám thực tế tại công trình." },
  { id: "n2", customerId: "c2", author: "Minh Hoàng", time: "Hôm nay, 10:15", content: "Chị Lan yêu cầu thay đổi màu Mosaic từ Xám sang Xanh Navy cho khu vực bồn tắm." },
  { id: "n3", customerId: "c7", author: "Ngọc Anh", time: "Hôm nay, 09:45", content: "Nội thất Urban muốn xem thêm 3 tone màu gạch thẻ handmade cho mảng tường quầy thu ngân." },
  { id: "n4", customerId: "c4", author: "Minh Hoàng", time: "Hôm qua, 16:20", content: "Cty An Gia đã ký hợp đồng nguyên tắc, chờ duyệt báo giá chi tiết 5 block." },
  { id: "n5", customerId: "c9", author: "Ngọc Anh", time: "Hôm qua, 15:20", content: "KTS An Nam đề nghị bổ sung mẫu Terracotta size 30x30 cho hạng mục sân hồ bơi." },
  { id: "n6", customerId: "c10", author: "Minh Hoàng", time: "2 ngày trước", content: "Cần đối chiếu công nợ Lê Gia — còn 128 triệu chưa thanh toán từ đơn hàng tháng 3." },
  { id: "n7", customerId: "c3", author: "Minh Hoàng", time: "3 ngày trước", content: "Đã gửi báo giá Boutique Homestay Hội An qua Zalo, chờ phản hồi từ chủ đầu tư." },
];

export type Receivable = {
  customerId: string;
  amount: number;
  dueDate: string;
  status: "overdue" | "due-soon" | "on-track";
  daysOverdue?: number;
  invoice: string;
};

export const receivables: Receivable[] = [
  { customerId: "c10", amount: 128_000_000, dueDate: "30/04/2024", status: "overdue", daysOverdue: 14, invoice: "HĐ-2024-0189" },
  { customerId: "c1", amount: 49_000_000, dueDate: "20/05/2024", status: "due-soon", invoice: "HĐ-2024-0221" },
  { customerId: "c9", amount: 45_200_000, dueDate: "18/05/2024", status: "due-soon", invoice: "HĐ-2024-0226" },
  { customerId: "c5", amount: 22_400_000, dueDate: "25/05/2024", status: "on-track", invoice: "HĐ-2024-0224" },
  { customerId: "c2", amount: 15_200_000, dueDate: "28/05/2024", status: "on-track", invoice: "HĐ-2024-0215" },
  { customerId: "c12", amount: 12_000_000, dueDate: "22/05/2024", status: "on-track", invoice: "HĐ-2024-0230" },
];

export const receivableStatusMeta: Record<
  Receivable["status"],
  { label: string; className: string }
> = {
  overdue: { label: "Quá hạn", className: "bg-destructive/10 text-destructive" },
  "due-soon": { label: "Sắp đến hạn", className: "bg-amber-50 text-amber-700" },
  "on-track": { label: "Trong hạn", className: "bg-secondary text-muted-foreground" },
};

export function getCustomer(id: string): Customer {
  return customers.find((c) => c.id === id)!;
}
