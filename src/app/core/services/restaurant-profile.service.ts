import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface RestaurantProfile {
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
export class RestaurantProfileService {

  private readonly apiUrl =
    `${environment.apiUrl}/api/restaurant/profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<RestaurantProfile> {
    return this.http.get<RestaurantProfile>(this.apiUrl);
  }

  updateProfile(data: FormData): Observable<RestaurantProfile> {
    return this.http.put<RestaurantProfile>(
      this.apiUrl,
      data
    );
  }
}
