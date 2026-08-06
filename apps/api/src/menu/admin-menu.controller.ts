import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  Role,
  upsertCategorySchema,
  upsertModifierGroupSchema,
  upsertProductSchema,
  type UpsertCategoryDto,
  type UpsertModifierGroupDto,
  type UpsertProductDto,
} from '@coffee/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthContext } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodBody } from '../common/zod.pipe';
import { AdminMenuService } from './admin-menu.service';

@Controller('v1/admin/menu')
@UseGuards(RolesGuard)
@Roles(Role.Owner, Role.Manager)
export class AdminMenuController {
  constructor(private readonly svc: AdminMenuService) {}

  // Категории
  @Get('categories')
  categories(@CurrentUser() u: AuthContext) {
    return this.svc.listCategories(u.tenantId);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() u: AuthContext,
    @Body(new ZodBody(upsertCategorySchema)) dto: UpsertCategoryDto,
  ) {
    return this.svc.createCategory(u.tenantId, dto);
  }

  @Put('categories/:id')
  updateCategory(
    @CurrentUser() u: AuthContext,
    @Param('id') id: string,
    @Body(new ZodBody(upsertCategorySchema)) dto: UpsertCategoryDto,
  ) {
    return this.svc.updateCategory(u.tenantId, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() u: AuthContext, @Param('id') id: string) {
    return this.svc.deleteCategory(u.tenantId, id);
  }

  // Товары
  @Post('products')
  createProduct(
    @CurrentUser() u: AuthContext,
    @Body(new ZodBody(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.svc.upsertProduct(u.tenantId, dto);
  }

  @Put('products/:id')
  updateProduct(
    @CurrentUser() u: AuthContext,
    @Param('id') id: string,
    @Body(new ZodBody(upsertProductSchema)) dto: UpsertProductDto,
  ) {
    return this.svc.upsertProduct(u.tenantId, dto, id);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser() u: AuthContext, @Param('id') id: string) {
    return this.svc.deleteProduct(u.tenantId, id);
  }

  // Группы модификаторов
  @Get('modifier-groups')
  modifierGroups(@CurrentUser() u: AuthContext) {
    return this.svc.listModifierGroups(u.tenantId);
  }

  @Post('modifier-groups')
  createGroup(
    @CurrentUser() u: AuthContext,
    @Body(new ZodBody(upsertModifierGroupSchema)) dto: UpsertModifierGroupDto,
  ) {
    return this.svc.upsertModifierGroup(u.tenantId, dto);
  }

  @Put('modifier-groups/:id')
  updateGroup(
    @CurrentUser() u: AuthContext,
    @Param('id') id: string,
    @Body(new ZodBody(upsertModifierGroupSchema)) dto: UpsertModifierGroupDto,
  ) {
    return this.svc.upsertModifierGroup(u.tenantId, dto, id);
  }

  @Delete('modifier-groups/:id')
  deleteGroup(@CurrentUser() u: AuthContext, @Param('id') id: string) {
    return this.svc.deleteModifierGroup(u.tenantId, id);
  }
}
