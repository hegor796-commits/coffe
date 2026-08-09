import type { MenuProduct } from '../../api/types';
import { lineKey } from '../../store/cart';

export interface Variant {
  options: Array<{ groupId: string; optionId: string; optionName: string; priceDelta: number }>;
  unitPrice: number;
  /** true, если дефолтов достаточно для оформления без открытия карточки. */
  valid: boolean;
  key: string;
}

/**
 * Дефолтный вариант товара: предвыбранные опции (isDefault) по каждой группе.
 * Используется для быстрого «+» на карточке меню. Если у обязательной группы
 * нет валидного дефолта — valid=false, и вместо быстрого добавления открываем
 * карточку выбора.
 */
export function defaultVariant(product: MenuProduct): Variant {
  let unitPrice = product.basePrice;
  const options: Variant['options'] = [];
  let valid = true;

  for (const g of product.modifierGroups) {
    const defaults = g.options.filter((o) => o.isDefault && o.available).slice(0, g.maxSelect);
    const need = Math.max(g.isRequired ? 1 : 0, g.minSelect);
    if (defaults.length < need) valid = false;
    for (const o of defaults) {
      unitPrice += o.priceDelta;
      options.push({ groupId: g.id, optionId: o.id, optionName: o.name, priceDelta: o.priceDelta });
    }
  }

  return {
    options,
    unitPrice,
    valid,
    key: lineKey(
      product.id,
      options.map((o) => o.optionId),
    ),
  };
}
