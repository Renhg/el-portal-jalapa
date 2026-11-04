

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RestaurantService } from '../../core/services/restaurant.service';
import { ProductService } from '../../core/services/product.service';

import { Restaurant } from '../../core/models/restaurant.model';
import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-restaurant-detail',
  imports: [RouterLink],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.css'
})
export class RestaurantDetail implements OnInit {

  restaurant: Restaurant | undefined;
  products: Product[] = [];

  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private restaurantService: RestaurantService,
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'El identificador de la tienda no es válido.';
      this.loading = false;
      return;
    }

    this.restaurantService.getRestaurantById(id).subscribe({
      next: (restaurant) => {
        this.restaurant = restaurant;
        this.cdr.markForCheck();

        if (!restaurant) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        this.productService.getProductsByRestaurant(id).subscribe({
          next: (products) => {
            this.products = products;
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error al cargar productos:', error);
            this.error = 'No se pudieron cargar los productos de esta tienda.';
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar la tienda:', error);
        this.error = 'No se pudo cargar la información de la tienda.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  addToCart(product: Product): void {
    this.cartService.addProduct(product);
  }
}
