

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { CartItem } from '../../core/models/cart-item.model';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit {
  items: CartItem[] = [];
  total = 0;

  address = '';
  phone = '';
  paymentMethod = 'Efectivo';

  loading = false;
  errorMessage = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.items = this.cartService.getItems();
    this.total = this.cartService.getTotal();
  }

  confirmOrder(): void {
    if (this.loading) return;

      this.errorMessage =  '';

    if (!this.items.length) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    if (!this.address.trim() || !this.phone.trim()) {
      this.errorMessage = 'Completa la dirección y el teléfono.';
      return;
    }

    const restaurantIds = new Set(
      this.items.map(item => item.product.restaurantId)
    );

    if (restaurantIds.size !== 1) {
      this.errorMessage =
        'Para realizar el pedido, todos los productos deben ser del mismo restaurante.';
      return;
    }

    this.loading = true;

    this.orderService.createOrder({
      items: this.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      address: this.address.trim(),
      phone: this.phone.trim(),
      payment_method:
        this.paymentMethod === 'Tarjeta' ? 'TARJETA' : 'EFECTIVO'
    }).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.loading = false;
        this.router.navigate(['/orders']);
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Tu sesión expiró. Inicia sesión nuevamente.';
        } else if (error.status === 422) {
          this.errorMessage =
            error.error?.detail ?? 'Los datos del pedido no son válidos.';
        } else {
          this.errorMessage =
            'No se pudo guardar el pedido. Revisa tu conexión e inténtalo de nuevo.';
        }
      }
    });
  }
}
