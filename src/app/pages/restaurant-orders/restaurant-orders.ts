

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  DestroyRef
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { timer, exhaustMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models/order.model';

@Component({
  selector: 'app-restaurant-orders',
  imports: [RouterLink],
  templateUrl: './restaurant-orders.html',
  styleUrl: './restaurant-orders.css'
})
export class RestaurantOrders implements OnInit {
  orders: Order[] = [];
  errorMessage = '';
  updatingOrderId: number | null = null;

  private readonly statusFlow: OrderStatus[] = [
    'RECIBIDO',
    'PREPARANDO',
    'EN CAMINO',
    'ENTREGADO'
  ];

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    timer(0, 5000).pipe(
      exhaustMap(() => this.orderService.getOrders()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: orders => {
        this.orders = orders;
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('No se pudieron cargar los pedidos:', error);
        this.errorMessage = 'No se pudieron cargar los pedidos.';
        this.cdr.detectChanges();
      }
    });
  }

  refreshOrders(): void {
    this.orderService.getOrders().subscribe({
      next: orders => {
        this.orders = orders;
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('No se pudieron cargar los pedidos:', error);
        this.errorMessage = 'No se pudieron cargar los pedidos.';
        this.cdr.detectChanges();
      }
    });
  }

  advanceOrder(order: Order): void {
    if (this.updatingOrderId !== null) {
      return;
    }

    const currentIndex = this.statusFlow.indexOf(order.status);

    if (currentIndex < 0 || currentIndex >= this.statusFlow.length - 1) {
      return;
    }

    const nextStatus = this.statusFlow[currentIndex + 1];

    this.updatingOrderId = order.id;
    this.errorMessage = '';

    this.orderService.updateOrderStatus(order.id, nextStatus).subscribe({
      next: () => {
        this.updatingOrderId = null;
        this.refreshOrders();
      },
      error: error => {
        console.error('No se pudo actualizar el pedido:', error);
        this.updatingOrderId = null;
        this.errorMessage =
          'No se pudo actualizar el estado. Verifica los permisos y vuelve a intentarlo.';
        this.cdr.detectChanges();
      }
    });
  }

  getNextStatus(status: OrderStatus): OrderStatus | null {
    const currentIndex = this.statusFlow.indexOf(status);

    if (currentIndex < 0 || currentIndex >= this.statusFlow.length - 1) {
      return null;
    }

    return this.statusFlow[currentIndex + 1];
  }
}
