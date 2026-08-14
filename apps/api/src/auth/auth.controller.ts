import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { ZodBody } from '../common/zod.pipe';
import { CurrentUser } from './current-user.decorator';
import { AuthContext } from './auth.types';

const loginSchema = z.object({
  initData: z.string().min(1),
  /** Резервный slug тенанта, если start_param не пробросился (напр. deep-link). */
  tenantSlug: z.string().optional(),
});

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('telegram')
  async telegram(@Body(new ZodBody(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.auth.loginWithInitData(body.initData, body.tenantSlug);
  }

  /** Диагностика: показывает роль и TG ID текущего пользователя. */
  @Get('me')
  me(@CurrentUser() user: AuthContext) {
    return { tgUserId: user.tgUserId, role: user.role, sub: user.sub, tenantId: user.tenantId };
  }
}
