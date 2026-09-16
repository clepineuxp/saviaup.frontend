import { AuthResult } from '../../../core/auth/auth-repository';
import { SessionTokens } from '../../../core/auth/session.model';
import { User } from '../../../core/models/user.model';
import { AuthSessionDto, RefreshTokenResponse, UserDto } from '../models/auth-contracts';

export const mapUserDto = (dto: UserDto): User => ({
  id: dto.id,
  firstName: dto.firstName,
  lastName: dto.lastName,
  email: dto.email,
  permissions: dto.permissions ?? [],
});

export const mapTokens = (dto: RefreshTokenResponse): SessionTokens => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
  expiresAt: dto.expiresAt,
});

export const mapAuthSession = (dto: AuthSessionDto): AuthResult => ({
  session: {
    tokens: mapTokens(dto),
    user: mapUserDto(dto.user),
    activeTenant: dto.activeTenant,
  },
  nextStep: dto.requiresTenantSelection ? 'tenant-selection' : 'app',
});
