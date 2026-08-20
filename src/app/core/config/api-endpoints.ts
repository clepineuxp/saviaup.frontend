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
  tenants: {
    root: '/api/tenants',
    select: (tenantId: string) => `/api/tenants/${tenantId}/select`,
  },
  i18n: {
    language: (language: string) => `/api/i18n/${language}`,
  },
} as const;
