import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { AuthSession, SessionTokens } from './session.model';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface RegisterCommand {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

export interface AuthResult {
  readonly session: AuthSession | null;
  readonly nextStep: 'login' | 'tenant-selection' | 'app';
}

export interface AuthRepository {
  login(command: LoginCommand): Observable<AuthResult>;
  register(command: RegisterCommand): Observable<AuthResult>;
  forgotPassword(email: string): Observable<void>;
  refresh(refreshToken: string): Observable<SessionTokens>;
  logout(refreshToken: string | null): Observable<void>;
  currentUser(): Observable<User>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
