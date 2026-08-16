import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@coffee/shared';
import { ROLES_KEY } from './roles.decorator';
import { AuthContext } from './auth.types';

/** Проверяет, что роль из JWT входит в список @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthContext | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Недостаточно прав');
    }
    return true;
  }
}
