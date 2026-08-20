import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { mapHttpError } from '../http/http-error.mapper';

export interface ApiRequestOptions {
  readonly params?: HttpParams | Readonly<Record<string, string | number | boolean>>;
  readonly context?: HttpContext;
  readonly headers?: HttpHeaders | Record<string, string | string[]>;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(APP_ENVIRONMENT);

  get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), options).pipe(this.handleErrors());
  }

  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: ApiRequestOptions = {},
  ): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(path), body, options).pipe(this.handleErrors());
  }

  put<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: ApiRequestOptions = {},
  ): Observable<TResponse> {
    return this.http.put<TResponse>(this.url(path), body, options).pipe(this.handleErrors());
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options: ApiRequestOptions = {},
  ): Observable<TResponse> {
    return this.http.patch<TResponse>(this.url(path), body, options).pipe(this.handleErrors());
  }

  delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.url(path), options).pipe(this.handleErrors());
  }

  private url(path: string): string {
    return `${this.environment.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private handleErrors<T>(): (source: Observable<T>) => Observable<T> {
    return (source) =>
      source.pipe(catchError((error: unknown) => throwError(() => mapHttpError(error))));
  }
}
