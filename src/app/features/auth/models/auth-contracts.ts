export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

export interface ForgotPasswordRequest {
  readonly email: string;
}

export interface UserDto {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly permissions?: readonly string[];
}

export interface ActiveTenantDto {
  readonly id: string;
  readonly name: string;
}

export interface AuthSessionDto {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
  readonly requiresTenantSelection: boolean;
  readonly user: UserDto;
  readonly activeTenant: ActiveTenantDto | null;
}

export type LoginResponse = AuthSessionDto;

export interface RegisterResponse {
  readonly session?: AuthSessionDto;
  readonly nextStep?: 'login' | 'tenant-selection';
}

export interface RefreshTokenResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
}
