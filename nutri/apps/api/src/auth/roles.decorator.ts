import { SetMetadata } from '@nestjs/common';
import { Role } from '@coffee/shared';

export const ROLES_KEY = 'roles';
/** Ограничивает доступ к эндпоинту перечисленными ролями. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
