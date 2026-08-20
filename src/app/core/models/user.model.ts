export interface User {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly permissions: readonly string[];
}

export const getUserDisplayName = (user: User): string =>
  `${user.firstName} ${user.lastName}`.trim();
