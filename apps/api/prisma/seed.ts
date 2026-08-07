/**
 * Сид демо-кофейни для локальной разработки.
 * Owner/barista привязываются к Telegram id из env SEED_OWNER_TG_ID / SEED_BARISTA_TG_ID,
 * чтобы можно было зайти реальным аккаунтом. По умолчанию — плейсхолдеры.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ownerTg = process.env.SEED_OWNER_TG_ID ?? '100000001';
  const baristaTg = process.env.SEED_BARISTA_TG_ID ?? '100000002';

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Coffee',
      plan: 'trial',
      paymentMode: 'offline',
      branding: { primaryColor: '#6F4E37', logoUrl: null },
    },
  });

  const location = await prisma.location.upsert({
    where: { id: `${tenant.id}-main` },
    update: {},
    create: {
      id: `${tenant.id}-main`,
      tenantId: tenant.id,
      name: 'На Тверской',
      address: 'ул. Тверская, 1',
      timezone: 'Europe/Moscow',
      maxOrdersPerSlot: 5,
      slotMinutes: 15,
    },
  });

  await prisma.staffUser.upsert({
    where: { tenantId_tgUserId: { tenantId: tenant.id, tgUserId: ownerTg } },
    update: {},
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
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      role: 'barista',
      tgUserId: baristaTg,
      name: 'Бариста',
    },
  });

  // Меню создаём только один раз (идемпотентность): если категории уже есть,
  // считаем, что кофейня засеяна, и выходим.
  const existingCategory = await prisma.category.findFirst({
    where: { tenantId: tenant.id },
  });
  if (existingCategory) {
    console.log('Сид: меню уже существует, пропускаю создание позиций.');
    console.log(`  tenant slug: ${tenant.slug}, owner tg: ${ownerTg}, barista tg: ${baristaTg}`);
    return;
  }

  // Меню: категория «Кофе», группы модификаторов «Размер» и «Молоко».
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

  console.log('Сид готов:');
  console.log(`  tenant slug: ${tenant.slug} (id ${tenant.id})`);
  console.log(`  location:    ${location.name} (id ${location.id})`);
  console.log(`  owner tg:    ${ownerTg}`);
  console.log(`  barista tg:  ${baristaTg}`);
  console.log(`  открыть Mini App: ?startapp=${tenant.slug}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
