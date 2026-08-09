import { create } from 'zustand';
import type { MenuProduct } from '../api/types';

export interface CartLine {
  key: string; // product + выбранные опции
  product: MenuProduct;
  quantity: number;
  options: Array<{ groupId: string; optionId: string; optionName: string; priceDelta: number }>;
  unitPrice: number;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, 'key'>) => void;
  changeQty: (key: string, delta: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export function lineKey(productId: string, optionIds: string[]): string {
  return `${productId}:${[...optionIds].sort().join(',')}`;
}

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  add: (line) => {
    const key = lineKey(
      line.product.id,
      line.options.map((o) => o.optionId),
    );
    set((state) => {
      const existing = state.lines.find((l) => l.key === key);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l,
          ),
        };
      }
      return { lines: [...state.lines, { ...line, key }] };
    });
  },
  changeQty: (key, delta) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    })),
  clear: () => set({ lines: [] }),
  total: () => get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
  count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
}));
