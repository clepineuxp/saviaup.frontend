export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly logoUrl?: string;
  readonly roleId: string;
  readonly roleName: string;
}

export interface TenantDto {
  readonly id: string;
  readonly name: string;
  readonly logoUrl?: string;
  readonly roleId: string;
  readonly roleName: string;
}

export interface CreateTenantRequest {
  readonly name: string;
}

export interface SelectTenantRequest {
  readonly tenantId: string;
}

export interface TenantSessionResponseDto {
  readonly tenant: TenantDto;
  readonly tokens: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresAt: string;
    readonly accessTokenExpiresAt: string;
    readonly refreshTokenExpiresAt: string;
  };
}
