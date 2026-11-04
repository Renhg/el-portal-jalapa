

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { RestaurantService } from '../../core/services/restaurant.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-restaurants',
  imports: [RouterLink, FormsModule],
  templateUrl: './restaurants.html',
  styleUrl: './restaurants.css'
})
export class Restaurants implements OnInit {

  restaurants: Restaurant[] = [];
  searchTerm = '';
  loading = true;
  error = '';

  constructor(
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef
  ) {}

  get filteredRestaurants(): Restaurant[] {
    const term = this.normalize(this.searchTerm.trim());

    if (!term) {
      return this.restaurants;
    }

    return this.restaurants.filter(restaurant => {
      const searchableText = this.normalize([
        restaurant.name,
        restaurant.category,
        restaurant.description
      ].join(' '));

      return searchableText.includes(term);
    });
  }

  ngOnInit(): void {
    this.restaurantService.getRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants = restaurants;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar las tiendas:', error);
        this.error = 'No se pudieron cargar las tiendas.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
