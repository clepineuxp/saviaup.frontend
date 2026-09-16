import {
  AvailableModule,
  AvailableModulesResponse,
  NavigationOption,
  NavigationSection,
  UserInfo,
} from '../../../core/context/authenticated-context.model';
import {
  AvailableModuleDto,
  AvailableModulesResponseDto,
  NavigationOptionDto,
  NavigationSectionDto,
  UserInfoDto,
} from '../models/authenticated-context-contracts';

export const mapUserInfoDto = (dto: UserInfoDto): UserInfo => ({
  firstName: dto.firstName,
  lastName: dto.lastName,
  organization: {
    id: dto.organization.id,
    name: dto.organization.name,
  },
  role: {
    id: dto.role.id,
    code: dto.role.code,
    name: dto.role.name,
  },
});

const mapAvailableModuleDto = (dto: AvailableModuleDto): AvailableModule => ({
  id: dto.id,
  code: dto.code.trim().toLowerCase(),
  name: dto.name,
  order: dto.order,
});

const mapNavigationOptionDto = (dto: NavigationOptionDto): NavigationOption => ({
  code: dto.code.trim().toLowerCase(),
  moduleCode: dto.moduleCode.trim().toLowerCase(),
  name: dto.name,
  order: dto.order,
});

const uniqueByCode = <T extends { readonly code: string }>(items: readonly T[]): readonly T[] => {
  const unique = new Map<string, T>();
  for (const item of items) {
    if (item.code && !unique.has(item.code)) unique.set(item.code, item);
  }
  return [...unique.values()];
};

const byOrder = <T extends { readonly order: number }>(left: T, right: T): number =>
  left.order - right.order;

const sortByOrder = <T extends { readonly order: number }>(items: readonly T[]): readonly T[] =>
  [...items].sort(byOrder);

const mapNavigationSectionDto = (dto: NavigationSectionDto): NavigationSection => ({
  code: dto.code.trim().toLowerCase(),
  name: dto.name,
  order: dto.order,
  isGrouped: dto.isGrouped,
  modules: sortByOrder(uniqueByCode(dto.modules.map(mapAvailableModuleDto))),
  options: sortByOrder(uniqueByCode(dto.options.map(mapNavigationOptionDto))),
});

export const mapAvailableModulesResponseDto = (
  dto: AvailableModulesResponseDto,
): AvailableModulesResponse => ({
  sections: sortByOrder(uniqueByCode(dto.sections.map(mapNavigationSectionDto))),
  emptyStateMessage: dto.emptyStateMessage,
});
