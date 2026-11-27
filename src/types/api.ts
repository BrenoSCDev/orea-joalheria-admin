/** Shapes returned by joalheria-api ({ success, data } envelope, Laravel paginator). */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  has_own_cover?: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  products_count?: number;
}

/** Category as embedded in products (parent present on product detail). */
export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent?: CategoryRef | null;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  is_cover: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  material: string | null;
  stone: string | null;
  weight_grams: string | null;
  size: string | null;
  price: string | null;
  /** Discounted price (lower than `price`); null = no discount. */
  promotional_price: string | null;
  stock_quantity: number;
  /** One-of-a-kind piece: stock is 1 (available) or 0 (sold). Default true. */
  is_unique: boolean;
  is_active: boolean;
  is_featured: boolean;
  /** Second row of pieces on the home, below the category banners. */
  is_subfeatured: boolean;
  /** "Peça destaque": the single piece shown open on the home (only one at a time). */
  is_spotlight: boolean;
  is_available: boolean;
  /** Ordered: the first one is the primary category. */
  categories: CategoryRef[];
  collection: Pick<Collection, "id" | "name" | "slug"> | null;
  cover_image?: ProductImage | null;
  images?: ProductImage[];
  /** Prices calculated by the API (list only): running campaign, else promotional price. */
  pricing?: Pricing;
}

/* ── "Desconto Configurado Geral" ─────────────────────────── */

export type PaymentType = "cash" | "installments";

/** One payment condition as priced by the API for a piece. */
export interface PricingOption {
  payment_type: PaymentType;
  max_installments: number;
  discount_percent: number;
  price: string;
  installment_price: string;
}

export interface Pricing {
  original_price: string | null;
  /** Lowest price the customer can pay. */
  price: string | null;
  discount_percent: number;
  source: "campaign" | "promotion" | null;
  campaign: { id: number; name: string } | null;
  options: PricingOption[];
}

export interface CampaignCondition {
  id?: number;
  payment_type: PaymentType;
  max_installments: number;
  discount_percent: number | string;
}

export interface CampaignProductRef {
  id: number;
  name: string;
  sku: string | null;
  price: string | null;
  cover_url: string | null;
}

export type CampaignStatus = "active" | "scheduled" | "ended" | "inactive";

export interface Campaign {
  id: number;
  name: string;
  is_active: boolean;
  applies_to_all: boolean;
  /** true = replaces the pieces' own promotional price; false = those pieces stay out. */
  override_product_promotions: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  status: CampaignStatus;
  conditions: CampaignCondition[];
  include_category_ids: number[];
  exclude_category_ids: number[];
  include_products: CampaignProductRef[];
  exclude_products: CampaignProductRef[];
  /** List only: published pieces that match the rules. */
  eligible_count?: number;
  updated_at: string;
}

export interface CampaignPreview {
  eligible_count: number;
  /** Eligible pieces taken by another running campaign with higher priority. */
  overridden_count: number;
  samples: (Pick<Product, "id" | "name" | "sku" | "price" | "promotional_price" | "cover_image"> & { pricing: Pricing })[];
}

export interface SiteSettings {
  store_name: string | null;
  tagline: string | null;
  about: string | null;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  opening_hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  /** Message the customer sends to the store WhatsApp to join the VIP group. */
  vip_whatsapp_message: string | null;
  cnpj: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  featured_eyebrow: string | null;
  featured_title: string | null;
  subfeatured_eyebrow: string | null;
  subfeatured_title: string | null;
  spotlight_eyebrow: string | null;
  /** One message per line; empty = no strip. */
  announcement_bar: string | null;
}

/** Quick flags toggled from the product list (menu / grid card). */
export type ProductToggle = Partial<Pick<Product, "is_active" | "is_featured" | "is_subfeatured" | "is_spotlight">>;

/** Payload of the "catalog.updated" event on the public "catalog" channel. */
export interface CatalogUpdatedEvent {
  entity: "product" | "category" | "collection" | "campaign" | "settings";
  action: "created" | "updated" | "deleted";
  data: Record<string, unknown>;
}
