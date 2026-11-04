

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'CLIENTE' | 'RESTAURANTE' | 'ADMIN';
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'CLIENTE' | 'RESTAURANTE';
  restaurant_name?: string;
}
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;
  private readonly tokenKey = 'adminfood_token';
  private readonly userKey = 'adminfood_user';

  constructor(private http: HttpClient) {}

  register(data: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/register`,
      data
    );
  }

  login(data: LoginData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => this.saveSession(response))
      );
  }

  private saveSession(response: AuthResponse): void {
    sessionStorage.setItem(this.tokenKey, response.access_token);
    sessionStorage.setItem(this.userKey, JSON.stringify(response.user));
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  getUser(): AuthUser | null {
    const user = sessionStorage.getItem(this.userKey);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as AuthUser;
    } catch {
      this.logout();
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }
}
