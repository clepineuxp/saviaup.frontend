export interface Organization {
  readonly id: string;
  readonly name: string;
}

export interface Role {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface UserInfo {
  readonly firstName: string;
  readonly lastName: string;
  readonly organization: Organization;
  readonly role: Role;
}

export interface AvailableModule {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly order: number;
}

export interface NavigationOption {
  readonly code: string;
  readonly moduleCode: string;
  readonly name: string;
  readonly order: number;
}

export interface NavigationSection {
  readonly code: string;
  readonly name: string;
  readonly order: number;
  readonly isGrouped: boolean;
  readonly modules: readonly AvailableModule[];
  readonly options: readonly NavigationOption[];
}

export interface AvailableModulesResponse {
  readonly sections: readonly NavigationSection[];
  readonly emptyStateMessage: string | null;
}

export interface AuthenticatedContext {
  readonly userInfo: UserInfo;
  readonly sections: readonly NavigationSection[];
  readonly emptyStateMessage: string | null;
}
