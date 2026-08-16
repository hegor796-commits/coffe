import { z } from 'zod';
import { Channel } from './enums';

/** Выбранная опция модификатора в позиции заказа. */
export const selectedOptionSchema = z.object({
  groupId: z.string().uuid(),
  optionId: z.string().uuid(),
});

/** Одна позиция в создаваемом заказе (что прислал клиент). */
export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  options: z.array(selectedOptionSchema).default([]),
});

/** Тело запроса создания заказа. Цены НЕ принимаем от клиента — считаем на сервере. */
export const createOrderSchema = z.object({
  // id точки — опаковый идентификатор приложения (uuid у новых точек, но у
  // демо-точки из раннего сида он вида `<tenant>-main`). Не привязываемся к
  // формату uuid; существование точки проверяется в сервисе с учётом тенанта.
  locationId: z.string().min(1),
  items: z.array(orderItemInputSchema).min(1).max(30),
  channel: z.nativeEnum(Channel).default(Channel.Tma),
  /** ISO-время желаемой готовности; null = как можно скорее. */
  readyAtRequested: z.string().datetime().nullable().optional(),
  comment: z.string().max(500).optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

/** Снапшот позиции, как он лежит в order.items (с ценами на момент заказа). */
export interface OrderItemSnapshot {
  productId: string;
  name: string;
  quantity: number;
  basePrice: number; // копейки
  options: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceDelta: number; // копейки
  }>;
  lineTotal: number; // копейки: (basePrice + sum(priceDelta)) * quantity
}

// --- Меню (админ) ---

export const upsertCategorySchema = z.object({
  name: z.string().min(1).max(120),
  sort: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const upsertProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  photoUrl: z.string().url().nullable().optional(),
  basePrice: z.number().int().min(0), // копейки
  sort: z.number().int().default(0),
  isActive: z.boolean().default(true),
  modifierGroupIds: z.array(z.string().uuid()).default([]),
});

export const upsertModifierGroupSchema = z.object({
  name: z.string().min(1).max(120),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  isRequired: z.boolean().default(false),
  options: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        priceDelta: z.number().int().default(0),
        isDefault: z.boolean().default(false),
        sort: z.number().int().default(0),
      }),
    )
    .min(1),
});

export const inviteStaffSchema = z.object({
  role: z.enum(['barista', 'manager']),
  locationId: z.string().min(1),
  name: z.string().max(120).optional(),
});

export type UpsertCategoryDto = z.infer<typeof upsertCategorySchema>;
export type UpsertProductDto = z.infer<typeof upsertProductSchema>;
export type UpsertModifierGroupDto = z.infer<typeof upsertModifierGroupSchema>;
export type InviteStaffDto = z.infer<typeof inviteStaffSchema>;
