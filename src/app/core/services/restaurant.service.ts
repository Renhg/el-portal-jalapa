import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Restaurant } from '../models/restaurant.model';
import { environment } from '../../../environments/environment';

interface RestaurantApi {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  image_url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {

  private readonly apiUrl =
`${environment.apiUrl}/api/restaurants`;
  constructor(private http: HttpClient) {}

  getRestaurants(): Observable<Restaurant[]> {
    return this.http
      .get<RestaurantApi[]>(this.apiUrl)
      .pipe(
        map(restaurants =>
          restaurants.map(restaurant =>
            this.formatRestaurant(restaurant)
          )
        )
      );
  }

  getRestaurantById(
    id: number
  ): Observable<Restaurant | undefined> {
    return this.getRestaurants().pipe(
      map(restaurants =>
        restaurants.find(restaurant => restaurant.id === id)
      )
    );
  }

  private formatRestaurant(
    restaurant: RestaurantApi
  ): Restaurant {
    const category = restaurant.category || 'General';

    return {
      id: restaurant.id,
      name: restaurant.name,
      description:
        restaurant.description || 'Descripción próximamente',
      category,
      deliveryTime: 'Tiempo por confirmar',
      image: this.getImage(category),
      imageUrl: restaurant.image_url
        ? `${environment.apiUrl}${restaurant.image_url}`
        : null
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

  if (
    normalized.includes('hamburguesa')
  ) {
    return '🍔';
  }

  if (normalized.includes('pizza')) return '🍕';
  if (normalized.includes('taco')) return '🌮';
  if (normalized.includes('pollo')) return '🍗';

  if (
    normalized.includes('cafe') ||
    normalized.includes('cafeteria')
  ) {
    return '☕';
  }

  if (
    normalized.includes('libro') ||
    normalized.includes('papeleria')
  ) {
    return '📚';
  }

  if (normalized.includes('farmacia')) return '💊';

  return '🏪';
  }
}
