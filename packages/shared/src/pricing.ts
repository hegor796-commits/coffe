import type { OrderItemSnapshot } from './dto';

/** Итоговая сумма позиции в копейках. */
export function lineTotal(basePrice: number, optionDeltas: number[], quantity: number): number {
  const unit = optionDeltas.reduce((sum, d) => sum + d, basePrice);
  return unit * quantity;
}

/** Сумма заказа по снапшотам позиций (копейки). */
export function orderTotal(items: OrderItemSnapshot[]): number {
  return items.reduce((sum, i) => sum + i.lineTotal, 0);
}

/** Форматирование копеек в рубли для отображения. */
export function formatMoney(kopecks: number, currency = '₽'): string {
  const rub = kopecks / 100;
  return `${rub.toLocaleString('ru-RU', { minimumFractionDigits: rub % 1 === 0 ? 0 : 2 })} ${currency}`;
}
