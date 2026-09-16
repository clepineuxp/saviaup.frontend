import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorKind } from './api-error';

interface ErrorPayload {
  readonly message?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly details?: Readonly<Record<string, readonly string[]>> | null;
  };
}

const errorKindByStatus: Readonly<Record<number, ApiErrorKind>> = {
  400: 'validation',
  401: 'unauthenticated',
  403: 'unauthorized',
  404: 'not-found',
  409: 'conflict',
  422: 'business',
  500: 'server',
};

export const mapHttpError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('unknown', 0, 'Ocurrió un error inesperado.');
  }

  const payload =
    typeof error.error === 'object' && error.error ? (error.error as ErrorPayload) : {};
  const kind = error.status === 0 ? 'network' : (errorKindByStatus[error.status] ?? 'unknown');
  const defaultMessage =
    error.status === 0
      ? 'No pudimos conectar con el servidor.'
      : 'No pudimos completar la solicitud.';

  return new ApiError(
    kind,
    error.status,
    payload.error?.message ?? payload.message ?? defaultMessage,
    payload.error?.details ?? payload.errors ?? {},
    payload.error?.code ?? null,
  );
};
