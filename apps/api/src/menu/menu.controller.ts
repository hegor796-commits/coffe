import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { MenuService } from './menu.service';

/** Меню для клиента (любая аутентифицированная роль своего тенанта). */
@Controller('v1/menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  async getMenu(@CurrentUser() user: AuthContext, @Query('location') locationId: string) {
    return this.menu.getPublicMenu(user.tenantId, locationId);
  }
}
