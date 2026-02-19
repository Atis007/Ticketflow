import { request } from "./http";

export function getAdminCategories({ token, signal }) {
  return request("admin/categories", { token, signal });
}

export function createCategory({ token, payload, signal }) {
  return request("admin/categories", {
    token,
    signal,
    method: "POST",
    body: payload,
  });
}

export function updateCategory({ token, id, payload, signal }) {
  return request(`admin/categories/${id}`, {
    token,
    signal,
    method: "PUT",
    body: payload,
  });
}

export function deleteCategory({ token, id, signal }) {
  return request(`admin/categories/${id}`, {
    token,
    signal,
    method: "DELETE",
  });
}

export function createSubcategory({ token, payload, signal }) {
  return request("admin/subcategories", {
    token,
    signal,
    method: "POST",
    body: payload,
  });
}

export function updateSubcategory({ token, id, payload, signal }) {
  return request(`admin/subcategories/${id}`, {
    token,
    signal,
    method: "PUT",
    body: payload,
  });
}

export function deleteSubcategory({ token, id, signal }) {
  return request(`admin/subcategories/${id}`, {
    token,
    signal,
    method: "DELETE",
  });
}
