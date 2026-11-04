// ✅ Consolidated: Use the shared api.ts instance instead of creating duplicate
import { api } from './api';

// ==================== VENDOR DASHBOARD ====================
export const getVendorDashboard = async () => {
  const response = await api.get('/dashboard/vendor/');
  return response.data;
};

// ==================== PRODUCTS ====================
export const getVendorProducts = async (params?: { page?: number; page_size?: number }) => {
  const response = await api.get('/products/', { params });
  return response.data;
};

export const createProduct = async (productData: FormData) => {
  const response = await api.post('/products/', productData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateProduct = async (identifier: string, productData: any) => {
  try {
    const response = await api.patch(`/products/${identifier}/`, productData);
    return response.data;
  } catch (error: any) {
    const fallbackIdentifier = productData?.slug;
    if (fallbackIdentifier && fallbackIdentifier !== identifier && error?.response?.status === 404) {
      const fallbackResponse = await api.patch(`/products/${fallbackIdentifier}/`, productData);
      return fallbackResponse.data;
    }
    throw error;
  }
};

export const deleteProduct = async (id: string, fallbackIdentifier?: string) => {
  try {
    const response = await api.delete(`/products/${id}/`);
    return response.data;
  } catch (error: any) {
    if (
      fallbackIdentifier &&
      fallbackIdentifier !== id &&
      error?.response?.status === 404
    ) {
      const fallbackResponse = await api.delete(`/products/${fallbackIdentifier}/`);
      return fallbackResponse.data;
    }
    throw error;
  }
};

export const toggleProductActive = async (identifier: string, fallbackIdentifier?: string) => {
  try {
    const response = await api.post(`/products/${identifier}/toggle_active/`);
    return response.data;
  } catch (error: any) {
    if (
      fallbackIdentifier &&
      fallbackIdentifier !== identifier &&
      error?.response?.status === 404
    ) {
      const fallbackResponse = await api.post(`/products/${fallbackIdentifier}/toggle_active/`);
      return fallbackResponse.data;
    }
    throw error;
  }
};

export const uploadProductImages = async (productId: string, images: File[], fallbackIdentifier?: string) => {
  const formData = new FormData();
  images.forEach((image) => formData.append('images', image));

  try {
    const response = await api.post(`/products/${productId}/upload_images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error: any) {
    if (
      fallbackIdentifier &&
      fallbackIdentifier !== productId &&
      error?.response?.status === 404
    ) {
      const fallbackResponse = await api.post(`/products/${fallbackIdentifier}/upload_images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return fallbackResponse.data;
    }
    throw error;
  }
};

// ==================== CATEGORIES ====================
export const getCategories = async () => {
  const response = await api.get('/categories/');
  return response.data;
};

// ==================== ORDERS ====================
export const getVendorOrders = async (params?: { page?: number; status?: string }) => {
  const response = await api.get('/orders/my_orders/', { params });
  return response.data;
};

export const confirmOrder = async (orderId: string) => {
  const response = await api.post(`/orders/${orderId}/confirm/`);
  return response.data;
};

export const getOrderDetails = async (orderId: string) => {
  const response = await api.get(`/orders/${orderId}/`);
  return response.data;
};

// ==================== PAYOUTS ====================
export const getVendorPayouts = async () => {
  const response = await api.get('/payouts/my_payouts/');
  return response.data;
};

// ==================== VENDOR SEARCH ====================
export interface VendorSearchResult {
  products: Array<{
    id: string;
    slug?: string;
    name: string;
    sku?: string;
    category?: string;
  }>;
  orders: Array<{
    id: string;
    order_id: string;
    customer_name: string;
  }>;
  customers: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
}

export const searchVendorData = async (query: string): Promise<VendorSearchResult> => {
  const search = query.trim();
  if (!search) {
    return { products: [], orders: [], customers: [] };
  }

  const normalized = search.toLowerCase();

  const [productsResponse, ordersResponse] = await Promise.allSettled([
    api.get('/products/', {
      params: { search, page: 1, page_size: 20 },
    }),
    api.get('/orders/my_orders/', {
      params: { page: 1 },
    }),
  ]);

  const productItemsRaw =
    productsResponse.status === 'fulfilled'
      ? (Array.isArray(productsResponse.value.data)
          ? productsResponse.value.data
          : productsResponse.value.data?.results || [])
      : [];

  const orderItemsRaw =
    ordersResponse.status === 'fulfilled'
      ? (Array.isArray(ordersResponse.value.data)
          ? ordersResponse.value.data
          : ordersResponse.value.data?.results || [])
      : [];

  const products = productItemsRaw
    .filter((product: any) => {
      const name = String(product?.name || '').toLowerCase();
      const sku = String(product?.sku || '').toLowerCase();
      const category = String(product?.category?.name || product?.category_name || '').toLowerCase();
      return name.includes(normalized) || sku.includes(normalized) || category.includes(normalized);
    })
    .slice(0, 5)
    .map((product: any) => ({
      id: String(product.id),
      slug: product.slug || '',
      name: product.name || 'Unnamed product',
      sku: product.sku || '',
      category: product?.category?.name || product?.category_name || '',
    }));

  const orders = orderItemsRaw
    .filter((order: any) => {
      const orderId = String(order?.order_id || order?.id || '').toLowerCase();
      const customerName = String(order?.customer?.full_name || order?.customer_name || '').toLowerCase();
      return orderId.includes(normalized) || customerName.includes(normalized);
    })
    .slice(0, 5)
    .map((order: any) => ({
      id: String(order.id || order.order_id || ''),
      order_id: String(order.order_id || order.id || '').toUpperCase(),
      customer_name: order?.customer?.full_name || order?.customer_name || 'Customer',
    }));

  const customersMap = new Map<string, { id: string; name: string; email?: string; phone?: string }>();
  orderItemsRaw.forEach((order: any) => {
    const rawCustomer = order?.customer || {};
    const customerId = String(rawCustomer.id || order?.customer_id || order?.customer_phone || order?.customer_name || '');
    if (!customerId) return;
    if (customersMap.has(customerId)) return;

    customersMap.set(customerId, {
      id: customerId,
      name: rawCustomer.full_name || order?.customer_name || 'Customer',
      email: rawCustomer.email || order?.customer_email || '',
      phone: rawCustomer.phone || order?.customer_phone || '',
    });
  });

  const customers = Array.from(customersMap.values())
    .filter((customer) => {
      const name = String(customer.name || '').toLowerCase();
      const email = String(customer.email || '').toLowerCase();
      const phone = String(customer.phone || '').toLowerCase();
      return name.includes(normalized) || email.includes(normalized) || phone.includes(normalized);
    })
    .slice(0, 5);

  return { products, orders, customers };
};

export interface VendorReviewItem {
  id: string;
  product_id: string;
  product_name: string;
  rating: number;
  comment: string;
  user_name: string;
  created_at: string;
}

export const getVendorReviews = async (): Promise<VendorReviewItem[]> => {
  const productsResponse = await getVendorProducts({ page: 1, page_size: 200 });
  const products = Array.isArray(productsResponse)
    ? productsResponse
    : productsResponse?.results || [];

  const reviewRequests = products.map((product: any) =>
    api.get(`/products/${product.id}/reviews/`).then((res) => ({
      product,
      reviews: Array.isArray(res.data) ? res.data : [],
    }))
  );

  const settled = await Promise.allSettled(reviewRequests);
  const aggregated: VendorReviewItem[] = [];

  settled.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    const { product, reviews } = result.value;
    reviews.forEach((review: any) => {
      aggregated.push({
        id: String(review.id),
        product_id: String(product.id),
        product_name: product.name || 'Product',
        rating: Number(review.rating || 0),
        comment: review.comment || '',
        user_name: review.user_name || 'Customer',
        created_at: review.created_at || '',
      });
    });
  });

  return aggregated.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

// ==================== VENDOR SETTINGS ====================
export const getVendorSettings = async () => {
  const response = await api.get('/vendors/settings/');
  return response.data;
};

export const updateVendorSecurity = async (data: {
  current_password?: string;
  new_password?: string;
}) => {
  const response = await api.post('/vendors/change-password/', {
    current_password: data.current_password,
    new_password: data.new_password,
  });
  return response.data;
};

export const beginVendor2FASetup = async () => {
  const response = await api.post('/vendors/2fa/setup/begin/');
  return response.data;
};

export const verifyVendor2FASetup = async (code: string) => {
  const response = await api.post('/vendors/2fa/setup/verify/', { code });
  return response.data;
};

export const regenerateVendorBackupCodes = async (payload: { current_password?: string; current_totp_code?: string }) => {
  const response = await api.post('/vendors/2fa/backup-codes/regenerate/', payload);
  return response.data;
};

export const disableVendor2FA = async (payload: { current_password: string; code: string }) => {
  const response = await api.post('/vendors/2fa/disable/', payload);
  return response.data;
};

export const updateVendorPolicies = async (policies: any) => {
  const response = await api.patch('/vendors/settings/', { policies });
  return response.data;
};

export const updateVendorNotifications = async (notifications: any) => {
  const response = await api.patch('/vendors/settings/', { notifications });
  return response.data;
};

export const updateVendorAppearance = async (payload: FormData | any) => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await api.patch('/vendors/settings/', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export default {
  getVendorDashboard,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  uploadProductImages,
  getCategories,
  getVendorOrders,
  confirmOrder,
  getOrderDetails,
  getVendorPayouts,
  searchVendorData,
  getVendorReviews,
  getVendorSettings,
  updateVendorSecurity,
  updateVendorPolicies,
  updateVendorNotifications,
  updateVendorAppearance,
  beginVendor2FASetup,
  verifyVendor2FASetup,
  regenerateVendorBackupCodes,
  disableVendor2FA,
};
