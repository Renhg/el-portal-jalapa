import { CartItem } from './cart-item.model';

export type OrderStatus =
  | 'RECIBIDO'
  | 'PREPARANDO'
  | 'EN CAMINO'
  | 'ENTREGADO';

export interface Order {
  id: number;
  customerName: string;
  items: CartItem[];
  address: string;
  phone: string;
  paymentMethod: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  latitude: number | null;
  longitude: number | null;
}
