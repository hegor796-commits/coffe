import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { ZodBody } from '../common/zod.pipe';

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
}
