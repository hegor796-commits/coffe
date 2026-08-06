import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from './auth.types';

/** Достаёт аутентифицированный контекст (req.user), заполненный JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthContext;
  },
);
