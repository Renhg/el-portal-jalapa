

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.errorMessage = '';

    const email = this.email.trim().toLowerCase();

    if (!email || !this.password) {
      this.errorMessage = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login({
      email,
      password: this.password,
    }).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.user.role === 'RESTAURANTE') {
        void this.router.navigate(['/restaurant/orders']);
        } else if (response.user.role === 'ADMIN') {
          void this.router.navigate(['/restaurant/orders']);
        } else {
        void this.router.navigate(['/restaurants']);
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.errorMessage = 'Correo o contraseña incorrectos.';
        } else {
          this.errorMessage =
            'No se pudo iniciar sesión. Verifica que la API esté funcionando.';
        }

        this.loading = false;
      },
    });
  }
}
