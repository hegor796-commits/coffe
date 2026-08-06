import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { AdminMenuService } from './admin-menu.service';
import { AdminMenuController } from './admin-menu.controller';

@Module({
  controllers: [MenuController, AdminMenuController],
  providers: [MenuService, AdminMenuService],
  exports: [MenuService],
})
export class MenuModule {}
