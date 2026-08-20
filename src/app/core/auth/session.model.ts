import { User } from '../models/user.model';
import { ActiveTenant } from '../tenant/tenant-context.service';

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export interface AuthSession {
  readonly tokens: SessionTokens;
  readonly user: User;
  readonly activeTenant?: ActiveTenant | null;
}
