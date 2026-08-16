import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { lineTotal, type OrderItemInput, type OrderItemSnapshot } from '@coffee/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Считает заказ на сервере из актуального меню. Клиентские цены игнорируются.
 * Проверяет: принадлежность товаров тенанту, стоп-лист точки, корректность
 * выбранных модификаторов (обязательность, лимиты, принадлежность группам).
 */
@Injectable()
export class OrderPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async buildSnapshot(
    tenantId: string,
    locationId: string,
    items: OrderItemInput[],
  ): Promise<{ snapshot: OrderItemSnapshot[]; total: number }> {
    const productIds = [...new Set(items.map((i) => i.productId))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true },
      include: {
        modifierGroups: {
          include: { group: { include: { options: true } } },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Активный стоп-лист точки.
    const now = new Date();
    const stopItems = await this.prisma.stopListItem.findMany({ where: { locationId } });
    const stoppedProducts = new Set<string>();
    const stoppedOptions = new Set<string>();
    for (const s of stopItems) {
      if (s.until && s.until < now) continue;
      if (s.productId) stoppedProducts.add(s.productId);
      if (s.optionId) stoppedOptions.add(s.optionId);
    }

    const snapshot: OrderItemSnapshot[] = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException(`Товар ${item.productId} недоступен`);
      if (stoppedProducts.has(product.id)) {
        throw new BadRequestException(`«${product.name}» временно недоступен`);
      }

      const groupsById = new Map(product.modifierGroups.map((pg) => [pg.group.id, pg.group]));
      const selectedByGroup = new Map<string, Set<string>>();
      const optionSnapshots: OrderItemSnapshot['options'] = [];

      for (const sel of item.options) {
        const group = groupsById.get(sel.groupId);
        if (!group) throw new BadRequestException('Недопустимая группа модификаторов');
        const option = group.options.find((o) => o.id === sel.optionId);
        if (!option) throw new BadRequestException('Недопустимая опция модификатора');
        if (stoppedOptions.has(option.id)) {
          throw new BadRequestException(`«${option.name}» временно недоступно`);
        }
        if (!selectedByGroup.has(group.id)) selectedByGroup.set(group.id, new Set());
        selectedByGroup.get(group.id)!.add(option.id);
        optionSnapshots.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        });
      }

      // Проверка обязательности и лимитов выбора по каждой группе товара.
      for (const pg of product.modifierGroups) {
        const g = pg.group;
        const count = selectedByGroup.get(g.id)?.size ?? 0;
        if (g.isRequired && count < Math.max(1, g.minSelect)) {
          throw new BadRequestException(`Выберите опцию в группе «${g.name}»`);
        }
        if (count < g.minSelect) {
          throw new BadRequestException(`В группе «${g.name}» нужно выбрать минимум ${g.minSelect}`);
        }
        if (count > g.maxSelect) {
          throw new BadRequestException(`В группе «${g.name}» максимум ${g.maxSelect}`);
        }
      }

      const deltas = optionSnapshots.map((o) => o.priceDelta);
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        basePrice: product.basePrice,
        options: optionSnapshots,
        lineTotal: lineTotal(product.basePrice, deltas, item.quantity),
      };
    });

    const total = snapshot.reduce((sum, i) => sum + i.lineTotal, 0);
    return { snapshot, total };
  }
}
