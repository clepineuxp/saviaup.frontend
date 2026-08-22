export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  users: {
    me: '/api/users/me',
    info: '/api/users/me/info',
  },
  modules: {
    available: '/api/modules/available',
  },
  categories: {
    root: '/api/categories',
    detail: (categoryId: string) => `/api/categories/${categoryId}`,
    status: (categoryId: string) => `/api/categories/${categoryId}/status`,
  },
  products: {
    root: '/api/products',
    detail: (productId: string) => `/api/products/${productId}`,
    status: (productId: string) => `/api/products/${productId}/status`,
  },
  tables: {
    root: '/api/tables',
    detail: (tableId: string) => `/api/tables/${tableId}`,
    operation: '/api/tables/operation',
    operationState: (tableId: string) => `/api/tables/${tableId}/operation`,
    order: (tableId: string) => `/api/tables/${tableId}/order`,
    areas: {
      root: '/api/table-areas',
      detail: (areaId: string) => `/api/table-areas/${areaId}`,
      reorder: '/api/table-areas/reorder',
    },
  },
  orders: {
    root: '/api/orders',
    items: '/api/orders/items',
    activeByTable: (tableId: string) => `/api/orders/table/${tableId}/active`,
    addItems: (tableId: string) => `/api/orders/table/${tableId}/items`,
    moveTable: (tableId: string) => `/api/orders/table/${tableId}/move`,
    cancelItem: (itemId: string) => `/api/orders/items/${itemId}/cancel`,
    checkout: (tableId: string) => `/api/orders/table/${tableId}/checkout`,
  },
  inventory: {
    root: '/api/inventory',
    ingredients: {
      root: '/api/inventory/ingredients',
      detail: (ingredientId: string) => `/api/inventory/ingredients/${ingredientId}`,
      status: (ingredientId: string) => `/api/inventory/ingredients/${ingredientId}/status`,
    },
    movements: '/api/inventory/movements',
    complements: {
      units: '/api/inventory/complements/units',
      unit: (unitId: string) => `/api/inventory/complements/units/${unitId}`,
      unitStatus: (unitId: string) => `/api/inventory/complements/units/${unitId}/status`,
    },
  },
  settings: {
    organization: '/api/settings/organization',
    organizationLogo: '/api/settings/organization/logo',
    business: '/api/settings/business',
    paymentMethods: '/api/settings/payment-methods',
    paymentMethod: (paymentMethodId: string) => `/api/settings/payment-methods/${paymentMethodId}`,
    paymentMethodStatus: (paymentMethodId: string) =>
      `/api/settings/payment-methods/${paymentMethodId}/status`,
    access: {
      permissions: '/api/settings/access/permissions',
      roles: '/api/settings/access/roles',
      role: (roleId: string) => `/api/settings/access/roles/${roleId}`,
      roleStatus: (roleId: string) => `/api/settings/access/roles/${roleId}/status`,
      users: '/api/settings/access/users',
      user: (entryId: string) => `/api/settings/access/users/${entryId}`,
    },
  },
  tenants: {
    root: '/api/tenants',
    select: (tenantId: string) => `/api/tenants/${tenantId}/select`,
  },
  cashRegisters: {
    root: '/api/cash-registers',
    detail: (cashRegisterId: string) => `/api/cash-registers/${cashRegisterId}`,
    status: (cashRegisterId: string) => `/api/cash-registers/${cashRegisterId}/status`,
    openShift: '/api/cash-registers/shifts/open',
    closeShift: (shiftId: string) => `/api/cash-registers/shifts/${shiftId}/close`,
    shiftSummary: (shiftId: string) => `/api/cash-registers/shifts/${shiftId}/summary`,
    shiftsPage: '/api/cash-registers/shifts',
  },
  i18n: {
    language: (language: string) => `/api/i18n/${language}`,
  },
} as const;
