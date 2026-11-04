

import { Component, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { timer, exhaustMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, DatePipe],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders implements OnInit {
  orders: Order[] = [];
  loading = true;
  errorMessage = '';

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
        this.loading = false;
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error al cargar los pedidos:', error);

        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Tu sesión expiró. Inicia sesión nuevamente.';
        } else {
          this.errorMessage =
            'No se pudieron cargar los pedidos. Inténtalo de nuevo.';
        }

        this.cdr.detectChanges();
      }
    });
  }
}
