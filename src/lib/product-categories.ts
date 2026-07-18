/** Nhóm sản phẩm — sidebar + filter */
export const PRODUCT_GROUPS = [
  {
    slug: "gach-the",
    category: "Gạch thẻ",
    label: "Gạch thẻ",
  },
  {
    slug: "gach-mosaic",
    category: "Gạch mosaic",
    label: "Gạch Mosaic",
  },
  {
    slug: "gach-bong",
    category: "Gạch bông",
    label: "Gạch bông",
  },
  {
    slug: "gach-300x600",
    category: "Gạch 300x600",
    label: "Gạch 300x600",
  },
] as const;

export type ProductGroupSlug = (typeof PRODUCT_GROUPS)[number]["slug"];

export function categoryFromSlug(slug: string | undefined): string | "all" {
  if (!slug) return "all";
  const g = PRODUCT_GROUPS.find((x) => x.slug === slug);
  return g?.category ?? "all";
}

export function slugFromCategory(category: string): ProductGroupSlug | null {
  const g = PRODUCT_GROUPS.find((x) => x.category === category);
  return g?.slug ?? null;
}

export function labelFromCategory(category: string): string {
  const g = PRODUCT_GROUPS.find((x) => x.category === category);
  return g?.label ?? category;
}
