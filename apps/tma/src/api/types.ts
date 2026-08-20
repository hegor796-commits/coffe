import type { OrderItemSnapshot, OrderStatus } from '@coffee/shared';

export interface MenuOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  available: boolean;
}

export interface MenuModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: MenuOption[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  basePrice: number;
  available: boolean;
  modifierGroups: MenuModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

export interface MenuResponse {
  location: {
    id: string;
    name: string;
    isAcceptingOrders: boolean;
    timezone: string;
    slotMinutes: number;
  };
  categories: MenuCategory[];
}

export interface OrderResponse {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMode: 'offline' | 'online';
  locationId: string;
  total: number;
  items: OrderItemSnapshot[];
  comment: string | null;
  readyAtPromised: string | null;
  createdAt: string;
  isTerminal: boolean;
}
