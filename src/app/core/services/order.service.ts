

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Order, OrderStatus } from '../models/order.model';
import { CartItem } from '../models/cart-item.model';
import { environment } from '../../../environments/environment';
export interface CreateOrderData {
  items: {
    product_id: number;
    quantity: number;
  }[];
  address: string;
  phone: string;
  payment_method: 'EFECTIVO' | 'TARJETA';
}

interface ApiOrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image_url: string | null;
}

interface ApiOrder {
  id: number;
  customer_id: number;
  restaurant_id: number;
  address: string;
  phone: string;
  payment_method: 'EFECTIVO' | 'TARJETA';
  total: number;
  status: OrderStatus;
  items: ApiOrderItem[];
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/orders`;
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('adminfood_token');

    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }

  private mapOrder(apiOrder: ApiOrder): Order {
    const items: CartItem[] = apiOrder.items.map(item => ({
      product: {
        id: item.product_id,
        restaurantId: apiOrder.restaurant_id,
        name: item.product_name,
        description: '',
        price: item.unit_price,
        category: '',
        image: item.image_url
         ? `${environment.apiUrl}${item.image_url}`
          : '📦'
      },
      quantity: item.quantity
    }));

    return {
      id: apiOrder.id,
      items,
      address: apiOrder.address,
      phone: apiOrder.phone,
      paymentMethod:
        apiOrder.payment_method === 'TARJETA' ? 'Tarjeta' : 'Efectivo',
      total: apiOrder.total,
      status: apiOrder.status,
      createdAt: apiOrder.created_at
        ? new Date(apiOrder.created_at)
        : new Date()
    };
  }

  createOrder(data: CreateOrderData): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(
      this.apiUrl,
      data,
      { headers: this.getHeaders() }
    );
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<ApiOrder[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map(orders => orders.map(order => this.mapOrder(order)))
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<ApiOrder>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(order => this.mapOrder(order))
    );
  }

  updateOrderStatus(
    id: number,
    status: OrderStatus
  ): Observable<unknown> {
    return this.http.patch(
      `${this.apiUrl}/${id}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }
}
