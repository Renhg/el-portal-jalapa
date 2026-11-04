import { Injectable } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private items: CartItem[] = [];

  getItems(): CartItem[] {
    return this.items;
  }

  addProduct(product: Product): void {

    const existingItem = this.items.find(
      item => item.product.id === product.id
    );

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.items.push({
        product: product,
        quantity: 1
      });
    }
  }

  removeProduct(productId: number): void {

    this.items = this.items.filter(
      item => item.product.id !== productId
    );
  }

  increaseQuantity(productId: number): void {

    const item = this.items.find(
      item => item.product.id === productId
    );

    if (item) {
      item.quantity++;
    }
  }

  decreaseQuantity(productId: number): void {

    const item = this.items.find(
      item => item.product.id === productId
    );

    if (!item) {
      return;
    }

    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.removeProduct(productId);
    }
  }

  getTotal(): number {

    return this.items.reduce(
      (total, item) =>
        total + item.product.price * item.quantity,
      0
    );
  }

  getItemCount(): number {

    return this.items.reduce(
      (count, item) =>
        count + item.quantity,
      0
    );
  }

  clearCart(): void {
    this.items = [];
  }
}
