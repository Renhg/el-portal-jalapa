import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { CartItem } from '../../core/models/cart-item.model';

@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit {

  items: CartItem[] = [];
  total = 0;
  itemCount = 0;

  constructor(
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.updateCart();
  }

  updateCart(): void {
    this.items = this.cartService.getItems();
    this.total = this.cartService.getTotal();
    this.itemCount = this.cartService.getItemCount();
  }

  increase(productId: number): void {
    this.cartService.increaseQuantity(productId);
    this.updateCart();
  }

  decrease(productId: number): void {
    this.cartService.decreaseQuantity(productId);
    this.updateCart();
  }

  remove(productId: number): void {
    this.cartService.removeProduct(productId);
    this.updateCart();
  }

  clear(): void {
    this.cartService.clearCart();
    this.updateCart();
  }
}
