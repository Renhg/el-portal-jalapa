

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of } from 'rxjs';

import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';
interface ProductApi {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: number | string;
  category: string | null;
  image_url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

private readonly baseUrl = environment.apiUrl;
private readonly apiUrl =
  `${this.baseUrl}/api/restaurants`;
  constructor(private http: HttpClient) {}

  getProductsByRestaurant(
    restaurantId: number
  ): Observable<Product[]> {
    return this.http
      .get<ProductApi[]>(
        `${this.apiUrl}/${restaurantId}/products`
      )
      .pipe(
        map(products =>
          products.map(product => this.formatProduct(product))
        )
      );
  }

  getProductById(id: number): Observable<Product | undefined> {
  return this.http
    .get<ProductApi>(
      `${this.baseUrl}/api/products/${id}`
    )
    .pipe(
      map(product => this.formatProduct(product))
    );
}
getMyRestaurantProducts(): Observable<Product[]> {
  return this.http
    .get<ProductApi[]>(
      `${this.baseUrl}/api/restaurant/products`
    )
    .pipe(
      map(products =>
        products.map(product => this.formatProduct(product))
      )
    );
}

createProduct(data: FormData): Observable<unknown> {
  return this.http.post(
    `${this.baseUrl}/api/restaurant/products`,
    data
  );
}

updateProduct(
  id: number,
  data: FormData
): Observable<unknown> {
  return this.http.put(
    `${this.baseUrl}/api/restaurant/products/${id}`,
    data
  );
}

deactivateProduct(id: number): Observable<unknown> {
  return this.http.delete(
    `${this.baseUrl}/api/restaurant/products/${id}`
  );
}
  private formatProduct(product: ProductApi): Product {
    const category = product.category || 'General';

    return {
      id: product.id,
      restaurantId: product.restaurant_id,
      name: product.name,
      description: product.description || 'Descripción próximamente',
      price: Number(product.price),
      category,
      image: product.image_url
        ? `${this.baseUrl}${product.image_url}`
        : this.getImage(category)
    };
  }



private getImage(category: string): string {
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    normalized.includes('supermercado') ||
    normalized.includes('abarrotes') ||
    normalized.includes('verdura') ||
    normalized.includes('fruta')
  ) {
    return '🥦';
  }

  if (
    normalized.includes('ropa') ||
    normalized.includes('vestimenta') ||
    normalized.includes('camisa') ||
    normalized.includes('calzado')
  ) {
    return '👕';
  }

  if (
    normalized.includes('tecnologia') ||
    normalized.includes('electronica') ||
    normalized.includes('computacion')
  ) {
    return '📱';
  }

  if (
    normalized.includes('cosmetica') ||
    normalized.includes('belleza') ||
    normalized.includes('maquillaje')
  ) {
    return '💄';
  }

  if (normalized.includes('hamburgues')) return '🍔';
  if (normalized.includes('pizza')) return '🍕';
  if (normalized.includes('taco')) return '🌮';
  if (normalized.includes('pollo')) return '🍗';
  if (normalized.includes('papas')) return '🍟';

  if (
    normalized.includes('libro') ||
    normalized.includes('papeleria')
  ) {
    return '📚';
  }

  if (normalized.includes('farmacia')) return '💊';

  return '📦';
}
}
