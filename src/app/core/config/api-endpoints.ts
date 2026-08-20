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
  tenants: {
    root: '/api/tenants',
    select: (tenantId: string) => `/api/tenants/${tenantId}/select`,
  },
  i18n: {
    language: (language: string) => `/api/i18n/${language}`,
  },
} as const;
