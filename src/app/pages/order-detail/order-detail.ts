

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css'
})
export class OrderDetail implements OnInit {
  order: Order | undefined;
  loading = true;
  errorMessage = '';

  statuses: OrderStatus[] = [
    'RECIBIDO',
    'PREPARANDO',
    'EN CAMINO',
    'ENTREGADO'
  ];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.loading = false;
      this.errorMessage = 'El identificador del pedido no es válido.';
      this.cdr.markForCheck();
      return;
    }

    this.orderService.getOrderById(id).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: error => {
        console.error('No se pudo cargar el pedido:', error);

        this.loading = false;

        if (error.status === 404) {
          this.errorMessage = 'El pedido no existe o no está disponible para tu cuenta.';
        } else if (error.status === 401) {
          this.errorMessage = 'Tu sesión expiró. Inicia sesión nuevamente.';
        } else {
          this.errorMessage = 'No se pudo cargar el pedido. Inténtalo de nuevo.';
        }

        this.cdr.markForCheck();
      }
    });
  }

  getStatusIndex(status: OrderStatus): number {
    return this.statuses.indexOf(status);
  }

  isCompleted(status: OrderStatus): boolean {
    if (!this.order) {
      return false;
    }

    return this.getStatusIndex(status) <=
      this.getStatusIndex(this.order.status);
  }
}
