export type ApiErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'unauthorized'
  | 'not-found'
  | 'conflict'
  | 'business'
  | 'server'
  | 'network'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
    readonly fieldErrors: Readonly<Record<string, readonly string[]>> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
