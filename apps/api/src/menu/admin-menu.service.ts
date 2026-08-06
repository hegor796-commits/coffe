import { Injectable, NotFoundException } from '@nestjs/common';
import { UpsertCategoryDto, UpsertModifierGroupDto, UpsertProductDto } from '@coffee/shared';
import { PrismaService } from '../prisma/prisma.service';

/** CRUD меню для админки владельца/менеджера. Всё скоупится по tenantId. */
@Injectable()
export class AdminMenuService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Категории ---

  listCategories(tenantId: string) {
    return this.prisma.category.findMany({ where: { tenantId }, orderBy: { sort: 'asc' } });
  }

  createCategory(tenantId: string, dto: UpsertCategoryDto) {
    return this.prisma.category.create({ data: { tenantId, ...dto } });
  }

  async updateCategory(tenantId: string, id: string, dto: UpsertCategoryDto) {
    await this.ensureOwned('category', tenantId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.ensureOwned('category', tenantId, id);
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  // --- Товары ---

  async upsertProduct(tenantId: string, dto: UpsertProductDto, id?: string) {
    // Проверяем, что категория принадлежит тенанту.
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, tenantId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    const { modifierGroupIds, ...data } = dto;

    if (id) {
      await this.ensureOwned('product', tenantId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data: { tenantId, ...data } });

      // Пересобираем связи с группами модификаторов.
      await tx.productModifierGroup.deleteMany({ where: { productId: product.id } });
      if (modifierGroupIds.length > 0) {
        // Убеждаемся, что группы принадлежат тенанту.
        const groups = await tx.modifierGroup.findMany({
          where: { id: { in: modifierGroupIds }, tenantId },
          select: { id: true },
        });
        await tx.productModifierGroup.createMany({
          data: groups.map((g, idx) => ({ productId: product.id, groupId: g.id, sort: idx })),
        });
      }
      return product;
    });
  }

  async deleteProduct(tenantId: string, id: string) {
    await this.ensureOwned('product', tenantId, id);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  // --- Группы модификаторов ---

  listModifierGroups(tenantId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { tenantId },
      include: { options: { orderBy: { sort: 'asc' } } },
    });
  }

  async upsertModifierGroup(tenantId: string, dto: UpsertModifierGroupDto, id?: string) {
    if (id) await this.ensureOwned('modifierGroup', tenantId, id);
    const { options, ...groupData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const group = id
        ? await tx.modifierGroup.update({ where: { id }, data: groupData })
        : await tx.modifierGroup.create({ data: { tenantId, ...groupData } });

      // Полная замена набора опций (простая и предсказуемая стратегия для админки).
      await tx.modifierOption.deleteMany({ where: { groupId: group.id } });
      await tx.modifierOption.createMany({
        data: options.map((o, idx) => ({
          groupId: group.id,
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
          sort: o.sort ?? idx,
        })),
      });
      return tx.modifierGroup.findUnique({
        where: { id: group.id },
        include: { options: { orderBy: { sort: 'asc' } } },
      });
    });
  }

  async deleteModifierGroup(tenantId: string, id: string) {
    await this.ensureOwned('modifierGroup', tenantId, id);
    await this.prisma.modifierGroup.delete({ where: { id } });
    return { ok: true };
  }

  /** Проверяет, что сущность принадлежит тенанту (иначе 404). */
  private async ensureOwned(
    model: 'category' | 'product' | 'modifierGroup',
    tenantId: string,
    id: string,
  ): Promise<void> {
    const found = await (this.prisma[model] as any).findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Запись не найдена');
  }
}
