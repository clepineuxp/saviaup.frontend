import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  AuthRepository,
  AuthResult,
  LoginCommand,
  RegisterCommand,
} from '../../../core/auth/auth-repository';
import { SessionTokens } from '../../../core/auth/session.model';
import { User } from '../../../core/models/user.model';
import { ApiError } from '../../../shared/http/api-error';

const DEMO_USER: User = {
  id: 'user-demo-001',
  firstName: 'Camila',
  lastName: 'Torres',
  email: 'admin@saviaup.local',
  permissions: ['tenant.create'],
};

@Injectable()
export class MockAuthRepository implements AuthRepository {
  private currentMockUser = DEMO_USER;

  login(command: LoginCommand): Observable<AuthResult> {
    if (command.email.toLowerCase() !== 'admin@saviaup.local' || command.password !== 'Savia123*') {
      return throwError(
        () => new ApiError('unauthenticated', 401, 'El correo o la contraseña no son correctos.'),
      ).pipe(delay(650));
    }

    this.currentMockUser = DEMO_USER;
    return of(this.authenticatedResult(this.currentMockUser)).pipe(delay(750));
  }

  register(command: RegisterCommand): Observable<AuthResult> {
    this.currentMockUser = {
      id: crypto.randomUUID(),
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      permissions: ['tenant.create'],
    };
    return of(this.authenticatedResult(this.currentMockUser)).pipe(delay(850));
  }

  forgotPassword(): Observable<void> {
    return of(undefined).pipe(delay(700));
  }

  refresh(): Observable<SessionTokens> {
    return of(this.tokens()).pipe(delay(250));
  }

  logout(): Observable<void> {
    return of(undefined).pipe(delay(200));
  }

  currentUser(): Observable<User> {
    return of(this.currentMockUser).pipe(delay(250));
  }

  private authenticatedResult(user: User): AuthResult {
    return {
      session: { tokens: this.tokens(), user, activeTenant: null },
      nextStep: 'tenant-selection',
    };
  }

  private tokens(): SessionTokens {
    return {
      accessToken: `mock-access-${crypto.randomUUID()}`,
      refreshToken: `mock-refresh-${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
}
