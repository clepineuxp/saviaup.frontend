import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AuthRepository,
  AuthResult,
  LoginCommand,
  RegisterCommand,
} from '../../../core/auth/auth-repository';
import { SessionTokens } from '../../../core/auth/session.model';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { User } from '../../../core/models/user.model';
import { ApiClient } from '../../../shared/api/api-client.service';
import { SKIP_AUTH } from '../../../core/interceptors/http-context.tokens';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  UserDto,
} from '../models/auth-contracts';
import { mapAuthSession, mapTokens, mapUserDto } from './auth.adapter';

@Injectable()
export class HttpAuthRepository implements AuthRepository {
  private readonly api = inject(ApiClient);

  login(command: LoginCommand): Observable<AuthResult> {
    return this.api
      .post<LoginResponse, LoginRequest>(API_ENDPOINTS.auth.login, command, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(map(mapAuthSession));
  }

  register(command: RegisterCommand): Observable<AuthResult> {
    return this.api
      .post<RegisterResponse, RegisterRequest>(API_ENDPOINTS.auth.register, command, {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        map((response) => ({
          session: response.session ? mapAuthSession(response.session).session : null,
          nextStep: response.nextStep ?? (response.session ? 'tenant-selection' : 'login'),
        })),
      );
  }

  forgotPassword(email: string): Observable<void> {
    return this.api.post<void, ForgotPasswordRequest>(
      API_ENDPOINTS.auth.forgotPassword,
      { email },
      { context: new HttpContext().set(SKIP_AUTH, true) },
    );
  }

  refresh(refreshToken: string): Observable<SessionTokens> {
    return this.api
      .post<RefreshTokenResponse, RefreshTokenRequest>(
        API_ENDPOINTS.auth.refresh,
        { refreshToken },
        { context: new HttpContext().set(SKIP_AUTH, true) },
      )
      .pipe(map(mapTokens));
  }

  logout(refreshToken: string | null): Observable<void> {
    return this.api.post<void, { readonly refreshToken: string | null }>(
      API_ENDPOINTS.auth.logout,
      {
        refreshToken,
      },
    );
  }

  currentUser(): Observable<User> {
    return this.api.get<UserDto>(API_ENDPOINTS.users.me).pipe(map(mapUserDto));
  }
}
