import { PrismaClient } from '@prisma/client';

/**
 * Идемпотентный сев демо-кофейни. Единый источник правды: используется и
 * standalone-скриптом (prisma/seed.ts), и SeedService на старте приложения.
 *
 * Каждый шаг независим и логируется, чтобы частичный сбой (напр. tenant создан,
 * а точка — нет) чинился на следующем запуске, а не оставлял кофейню без точки.
 */
export interface SeedOptions {
  ownerTg?: string;
  baristaTg?: string;
  slug?: string;
  log?: (msg: string) => void;
}

// Достаточно узкий тип, чтобы принимать и PrismaClient, и PrismaService.
type Db = Pick<
  PrismaClient,
  | 'tenant'
  | 'location'
  | 'staffUser'
  | 'category'
  | 'modifierGroup'
  | 'product'
  | 'productModifierGroup'
>;

export async function seedDemo(prisma: Db, opts: SeedOptions = {}): Promise<void> {
  const log = opts.log ?? (() => undefined);
  const ownerTg = opts.ownerTg ?? process.env.SEED_OWNER_TG_ID ?? '100000001';
  const baristaTg = opts.baristaTg ?? process.env.SEED_BARISTA_TG_ID ?? '100000002';
  const slug = opts.slug ?? process.env.DEFAULT_TENANT_SLUG ?? 'demo';

  // 1. Тенант.
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: 'Любовь-Морковь',
      plan: 'trial',
      paymentMode: 'offline',
      branding: { primaryColor: '#6B1D1D', logoUrl: null },
    },
  });

  // 2. Точка. Гарантируем наличие хотя бы одной активной точки НЕЗАВИСИМО от
  //    остального (это и есть основное самоисцеление: раньше tenant мог
  //    остаться без точки, и клиент видел «нет активных точек»).
  let location = await prisma.location.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!location) {
    location = await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: 'На Тверской',
        address: 'ул. Тверская, 1',
        timezone: 'Europe/Moscow',
        isAcceptingOrders: true,
        maxOrdersPerSlot: 5,
        slotMinutes: 15,
      },
    });
    log(`создана точка «${location.name}» (${location.id})`);
  }

  // 3. Персонал (owner/barista) — по Telegram id из env.
  log(`персонал: owner tgId=${ownerTg}, barista tgId=${baristaTg}`);
  await prisma.staffUser.upsert({
    where: { tenantId_tgUserId: { tenantId: tenant.id, tgUserId: ownerTg } },
    update: { role: 'owner', isActive: true },
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      role: 'owner',
      tgUserId: ownerTg,
      name: 'Владелец',
    },
  });
  await prisma.staffUser.upsert({
    where: { tenantId_tgUserId: { tenantId: tenant.id, tgUserId: baristaTg } },
    update: { role: 'barista', isActive: true },
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      role: 'barista',
      tgUserId: baristaTg,
      name: 'Бариста',
    },
  });
  log(`персонал зарегистрирован`);

  // 4. Меню создаём один раз: если категории уже есть — пропускаем.
  const existingCategory = await prisma.category.findFirst({ where: { tenantId: tenant.id } });
  if (existingCategory) {
    log(`сев ок: tenant=${slug}, точка есть, меню уже существует`);
    return;
  }

  const coffee = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Кофе', sort: 0 },
  });

  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Размер',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: {
        create: [
          { name: 'S (250 мл)', priceDelta: 0, isDefault: true, sort: 0 },
          { name: 'M (350 мл)', priceDelta: 4000, sort: 1 },
          { name: 'L (450 мл)', priceDelta: 7000, sort: 2 },
        ],
      },
    },
  });

  const milkGroup = await prisma.modifierGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Молоко',
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      options: {
        create: [
          { name: 'Обычное', priceDelta: 0, isDefault: true, sort: 0 },
          { name: 'Растительное', priceDelta: 5000, sort: 1 },
          { name: 'Банановое', priceDelta: 6000, sort: 2 },
        ],
      },
    },
  });

  const products = [
    { name: 'Капучино', basePrice: 22000, groups: [sizeGroup.id, milkGroup.id] },
    { name: 'Латте', basePrice: 24000, groups: [sizeGroup.id, milkGroup.id] },
    { name: 'Американо', basePrice: 18000, groups: [sizeGroup.id] },
    { name: 'Флэт-уайт', basePrice: 26000, groups: [sizeGroup.id, milkGroup.id] },
  ];

  for (const [i, p] of products.entries()) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: coffee.id,
        name: p.name,
        basePrice: p.basePrice,
        sort: i,
      },
    });
    await prisma.productModifierGroup.createMany({
      data: p.groups.map((gid, idx) => ({ productId: product.id, groupId: gid, sort: idx })),
    });
  }

  log(`сев готов: tenant=${slug}, точка «${location.name}», меню из ${products.length} позиций`);
}
