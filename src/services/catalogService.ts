import { apiClient } from "./apiClient";
import { endpoints } from "@/config/api";
import { ApiResponse, Campaign, CampaignCondition, CampaignPreview, Category, Collection, Paginated, Product, ProductImage, SiteSettings } from "@/types/api";

export interface DashboardData {
  products: number;
  products_active: number;
  products_out_of_stock: number;
  categories: number;
  collections: number;
  without_images: number;
  recent_products: Product[];
  out_of_stock: Product[];
}

export type ProductStatusFilter = "published" | "draft" | "out_of_stock" | "featured" | "subfeatured" | "spotlight";

export interface ProductFilters {
  q?: string;
  category_id?: number;
  collection_id?: number;
  status?: ProductStatusFilter;
  page?: number;
  per_page?: number;
}

/** Fields sent when creating/updating a piece. */
export interface ProductPayload {
  name: string;
  slug?: string | null;
  sku?: string | null;
  /** Ordered: the first id is the primary category. */
  category_ids?: number[];
  collection_id?: number | null;
  short_description?: string | null;
  description?: string | null;
  material?: string | null;
  stone?: string | null;
  weight_grams?: number | string | null;
  size?: string | null;
  price?: number | string | null;
  promotional_price?: number | string | null;
  stock_quantity?: number;
  is_unique?: boolean;
  is_active?: boolean;
  is_featured?: boolean;
  is_subfeatured?: boolean;
  is_spotlight?: boolean;
}

/** Category/collection fields; the image goes as multipart. */
export interface TaxonomyPayload {
  name: string;
  /** Categories only: null = top level. */
  parent_id?: number | null;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  image?: File | null;
}

/** Campaign form as sent to the API. */
export interface CampaignPayload {
  id?: number;
  name: string;
  is_active: boolean;
  applies_to_all: boolean;
  override_product_promotions: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  conditions: Omit<CampaignCondition, "id">[];
  include_category_ids: number[];
  exclude_category_ids: number[];
  include_product_ids: number[];
  exclude_product_ids: number[];
}

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

/**
 * Multipart body for categories/collections. Updates go as POST + _method=PUT
 * because PHP does not parse multipart bodies on real PUT requests.
 */
function taxonomyForm(data: TaxonomyPayload, fileField: "image" | "cover", method?: "PUT") {
  const form = new FormData();
  form.append("name", data.name);
  if (data.parent_id !== undefined) form.append("parent_id", data.parent_id ? String(data.parent_id) : "");
  if (data.slug !== undefined) form.append("slug", data.slug);
  form.append("description", data.description ?? "");
  if (data.is_active !== undefined) form.append("is_active", data.is_active ? "1" : "0");
  if (data.is_featured !== undefined) form.append("is_featured", data.is_featured ? "1" : "0");
  if (data.image) form.append(fileField, data.image);
  if (method) form.append("_method", method);
  return form;
}

export interface ImportRowIssue {
  line: number;
  name: string | null;
  message: string;
}

export interface ImportItem {
  line: number;
  action: "create" | "update";
  name: string;
  sku: string | null;
  price: string | null;
  stock_quantity: number;
  is_unique: boolean;
  is_active: boolean;
  categories: string[];
}

export interface ImportReport {
  dry_run: boolean;
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  categories_created: string[];
  errors: ImportRowIssue[];
  warnings: ImportRowIssue[];
  items: ImportItem[];
}

export type BulkAction =
  | "publish"
  | "unpublish"
  | "feature"
  | "unfeature"
  | "subfeature"
  | "unsubfeature"
  | "set_stock"
  | "set_discount"
  | "clear_discount"
  | "mark_unique"
  | "unmark_unique"
  | "add_categories"
  | "remove_categories"
  | "set_collection"
  | "delete";

/** Target: explicit ids, or every product matching the list filters (all pages). */
export type BulkTarget = { ids: number[] } | { all: true; filters: Omit<ProductFilters, "page" | "per_page"> };

export interface BulkPayload {
  action: BulkAction;
  value?: number;
  category_ids?: number[];
  collection_id?: number | null;
}

export const catalogService = {
  dashboard: () => unwrap(apiClient.get<ApiResponse<DashboardData>>(endpoints.admin.dashboard)),

  // Products
  products: (params: ProductFilters = {}) =>
    unwrap(apiClient.get<ApiResponse<Paginated<Product>>>(endpoints.admin.products.list, { params })),
  product: (id: number) => unwrap(apiClient.get<ApiResponse<Product>>(endpoints.admin.products.show(id))),
  createProduct: (data: ProductPayload) => unwrap(apiClient.post<ApiResponse<Product>>(endpoints.admin.products.create, data)),
  updateProduct: (id: number, data: Partial<ProductPayload>) =>
    unwrap(apiClient.put<ApiResponse<Product>>(endpoints.admin.products.update(id), data)),
  updateStock: (id: number, stock_quantity: number) =>
    unwrap(apiClient.patch<ApiResponse<Product>>(endpoints.admin.products.stock(id), { stock_quantity })),
  deleteProduct: (id: number) => apiClient.delete<ApiResponse<null>>(endpoints.admin.products.delete(id)),

  bulkProducts: (target: BulkTarget, payload: BulkPayload) =>
    unwrap(apiClient.post<ApiResponse<{ affected: number; action: BulkAction }>>(endpoints.admin.products.bulk, { ...target, ...payload })),

  /** CSV import from the previous e-commerce. dryRun = preview only. */
  importProducts: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append("file", file);
    form.append("dry_run", dryRun ? "1" : "0");
    return unwrap(apiClient.post<ApiResponse<ImportReport>>(endpoints.admin.products.import, form, { timeout: 300000 }));
  },

  // Product images
  uploadImages: (id: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("images[]", f));
    return unwrap(apiClient.post<ApiResponse<ProductImage[]>>(endpoints.admin.products.images(id), form));
  },
  updateImage: (id: number, imageId: number, data: Partial<Pick<ProductImage, "alt" | "is_cover" | "sort_order">>) =>
    unwrap(apiClient.patch<ApiResponse<ProductImage>>(endpoints.admin.products.image(id, imageId), data)),
  deleteImage: (id: number, imageId: number) => apiClient.delete(endpoints.admin.products.image(id, imageId)),

  // Categories
  categories: () => unwrap(apiClient.get<ApiResponse<Category[]>>(endpoints.admin.categories.list)),
  createCategory: (data: TaxonomyPayload) =>
    unwrap(apiClient.post<ApiResponse<Category>>(endpoints.admin.categories.create, taxonomyForm(data, "image"))),
  updateCategory: (id: number, data: TaxonomyPayload) =>
    unwrap(apiClient.post<ApiResponse<Category>>(endpoints.admin.categories.update(id), taxonomyForm(data, "image", "PUT"))),
  deleteCategory: (id: number) => apiClient.delete(endpoints.admin.categories.delete(id)),
  /** Drag & drop: new parent (null = top level) + ordered ids of that level, including the moved one. */
  moveCategory: (id: number, data: { parent_id: number | null; ids: number[] }) =>
    unwrap(apiClient.post<ApiResponse<Category>>(endpoints.admin.categories.move(id), data)),

  // Collections
  collections: () => unwrap(apiClient.get<ApiResponse<Collection[]>>(endpoints.admin.collections.list)),
  createCollection: (data: TaxonomyPayload) =>
    unwrap(apiClient.post<ApiResponse<Collection>>(endpoints.admin.collections.create, taxonomyForm(data, "cover"))),
  updateCollection: (id: number, data: TaxonomyPayload) =>
    unwrap(apiClient.post<ApiResponse<Collection>>(endpoints.admin.collections.update(id), taxonomyForm(data, "cover", "PUT"))),
  deleteCollection: (id: number) => apiClient.delete(endpoints.admin.collections.delete(id)),

  // Campaigns ("Desconto Configurado Geral")
  campaigns: () => unwrap(apiClient.get<ApiResponse<Campaign[]>>(endpoints.admin.campaigns.list)),
  campaign: (id: number) => unwrap(apiClient.get<ApiResponse<Campaign>>(endpoints.admin.campaigns.show(id))),
  createCampaign: (data: CampaignPayload) => unwrap(apiClient.post<ApiResponse<Campaign>>(endpoints.admin.campaigns.create, data)),
  updateCampaign: (id: number, data: CampaignPayload) => unwrap(apiClient.put<ApiResponse<Campaign>>(endpoints.admin.campaigns.update(id), data)),
  deleteCampaign: (id: number) => apiClient.delete(endpoints.admin.campaigns.delete(id)),
  /** Simulates an unsaved form: matching pieces and example prices, calculated by the API. */
  previewCampaign: (data: CampaignPayload) => unwrap(apiClient.post<ApiResponse<CampaignPreview>>(endpoints.admin.campaigns.preview, data)),

  // Institutional settings
  settings: () => unwrap(apiClient.get<ApiResponse<SiteSettings>>(endpoints.admin.settings)),
  updateSettings: (data: Partial<SiteSettings>) => unwrap(apiClient.put<ApiResponse<SiteSettings>>(endpoints.admin.settings, data)),
};
