export interface OrganizationDto {
  readonly id: string;
  readonly name: string;
}

export interface RoleDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface UserInfoDto {
  readonly firstName: string;
  readonly lastName: string;
  readonly organization: OrganizationDto;
  readonly role: RoleDto;
}

export interface AvailableModuleDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly order: number;
}

export interface NavigationOptionDto {
  readonly code: string;
  readonly moduleCode: string;
  readonly name: string;
  readonly order: number;
}

export interface NavigationSectionDto {
  readonly code: string;
  readonly name: string;
  readonly order: number;
  readonly isGrouped: boolean;
  readonly modules: readonly AvailableModuleDto[];
  readonly options: readonly NavigationOptionDto[];
}

export interface AvailableModulesResponseDto {
  readonly sections: readonly NavigationSectionDto[];
  readonly emptyStateMessage: string | null;
}
