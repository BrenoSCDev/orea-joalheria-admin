const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:83/api";

/** Public site URL, for "Ver no site" links. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "http://localhost:5181").replace(/\/$/, "");

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export const endpoints = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  admin: {
    dashboard: "/admin/dashboard",
    categories: {
      list: "/admin/categories",
      create: "/admin/categories",
      show: (id: number) => `/admin/categories/${id}`,
      update: (id: number) => `/admin/categories/${id}`,
      delete: (id: number) => `/admin/categories/${id}`,
      move: (id: number) => `/admin/categories/${id}/move`,
    },
    collections: {
      list: "/admin/collections",
      create: "/admin/collections",
      show: (id: number) => `/admin/collections/${id}`,
      update: (id: number) => `/admin/collections/${id}`,
      delete: (id: number) => `/admin/collections/${id}`,
    },
    products: {
      list: "/admin/products",
      create: "/admin/products",
      show: (id: number) => `/admin/products/${id}`,
      update: (id: number) => `/admin/products/${id}`,
      delete: (id: number) => `/admin/products/${id}`,
      stock: (id: number) => `/admin/products/${id}/stock`,
      import: "/admin/products/import",
      bulk: "/admin/products/bulk",
      images: (id: number) => `/admin/products/${id}/images`,
      image: (id: number, imageId: number) => `/admin/products/${id}/images/${imageId}`,
    },
    settings: "/admin/settings",
  },
};
