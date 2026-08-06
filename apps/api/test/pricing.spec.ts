import { lineTotal, orderTotal, formatMoney, type OrderItemSnapshot } from '@coffee/shared';

describe('Расчёт цены', () => {
  it('lineTotal складывает базу, модификаторы и множит на количество', () => {
    // Капучино 220₽ + размер L (+70₽) + растительное молоко (+50₽) = 340₽, ×2 = 680₽
    expect(lineTotal(22000, [7000, 5000], 2)).toBe(68000);
  });

  it('lineTotal без модификаторов', () => {
    expect(lineTotal(18000, [], 3)).toBe(54000);
  });

  it('orderTotal суммирует позиции', () => {
    const items: OrderItemSnapshot[] = [
      { productId: 'a', name: 'A', quantity: 1, basePrice: 22000, options: [], lineTotal: 22000 },
      { productId: 'b', name: 'B', quantity: 2, basePrice: 18000, options: [], lineTotal: 36000 },
    ];
    expect(orderTotal(items)).toBe(58000);
  });

  it('formatMoney форматирует копейки в рубли', () => {
    expect(formatMoney(22000)).toContain('220');
    expect(formatMoney(0)).toContain('0');
  });
});
