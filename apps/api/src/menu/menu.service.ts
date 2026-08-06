import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Публичное меню с учётом стоп-листа точки. */
@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Возвращает дерево меню (категории → товары → группы модификаторов → опции)
   * с флагами доступности по стоп-листу конкретной точки.
   */
  async getPublicMenu(tenantId: string, locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!location) throw new NotFoundException('Точка не найдена');

    const now = new Date();
    const [categories, stopItems] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId, isActive: true },
        orderBy: { sort: 'asc' },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { sort: 'asc' },
            include: {
              modifierGroups: {
                orderBy: { sort: 'asc' },
                include: {
                  group: { include: { options: { orderBy: { sort: 'asc' } } } },
                },
              },
            },
          },
        },
      }),
      this.prisma.stopListItem.findMany({ where: { locationId } }),
    ]);

    // Активные стоп-позиции (бессрочные или ещё не истёкшие).
    const stoppedProducts = new Set<string>();
    const stoppedOptions = new Set<string>();
    for (const s of stopItems) {
      if (s.until && s.until < now) continue;
      if (s.productId) stoppedProducts.add(s.productId);
      if (s.optionId) stoppedOptions.add(s.optionId);
    }

    return {
      location: {
        id: location.id,
        name: location.name,
        isAcceptingOrders: location.isAcceptingOrders,
        timezone: location.timezone,
        slotMinutes: location.slotMinutes,
      },
      categories: categories
        .map((c) => ({
          id: c.id,
          name: c.name,
          products: c.products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            photoUrl: p.photoUrl,
            basePrice: p.basePrice,
            available: !stoppedProducts.has(p.id),
            modifierGroups: p.modifierGroups.map((pg) => ({
              id: pg.group.id,
              name: pg.group.name,
              minSelect: pg.group.minSelect,
              maxSelect: pg.group.maxSelect,
              isRequired: pg.group.isRequired,
              options: pg.group.options.map((o) => ({
                id: o.id,
                name: o.name,
                priceDelta: o.priceDelta,
                isDefault: o.isDefault,
                available: !stoppedOptions.has(o.id),
              })),
            })),
          })),
        }))
        .filter((c) => c.products.length > 0),
    };
  }
}
