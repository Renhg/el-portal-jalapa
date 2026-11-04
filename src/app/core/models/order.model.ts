import { CartItem } from './cart-item.model';

export type OrderStatus =
  | 'RECIBIDO'
  | 'PREPARANDO'
  | 'EN CAMINO'
  | 'ENTREGADO';

export interface Order {
  id: number;
  items: CartItem[];
  address: string;
  phone: string;
  paymentMethod: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}
