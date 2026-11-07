import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: 'CLIENTE' | 'RESTAURANTE' = 'CLIENTE';
  restaurantName = '';

  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    const name = this.name.trim();
    const email = this.email.trim().toLowerCase();

    if (name.length < 2) {
      this.errorMessage.set(
        'El nombre debe tener al menos 2 caracteres.'
      );
      return;
    }

    if (this.password.length < 8 || this.password.length > 128) {
      this.errorMessage.set(
        'La contraseña debe tener entre 8 y 128 caracteres.'
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (
      this.role === 'RESTAURANTE' &&
      this.restaurantName.trim().length < 2
    ) {
      this.errorMessage.set(
        'El nombre de la tienda debe tener al menos 2 caracteres.'
      );
      return;
    }

    this.loading.set(true);

    this.authService.register({
      name,
      email,
      password: this.password,
      role: this.role,
      ...(this.role === 'RESTAURANTE'
        ? { restaurant_name: this.restaurantName.trim() }
        : {}),
    }).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);

        this.name = '';
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
        this.restaurantName = '';

        this.loading.set(false);

        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409) {
          this.errorMessage.set(
            'Ese correo electrónico ya está registrado.'
          );
        } else if (error.status === 422) {
          this.errorMessage.set(
            'Revisa los datos. Algunos no son válidos.'
          );
        } else {
          this.errorMessage.set(
            'No se pudo completar el registro. Verifica que la API esté funcionando.'
          );
        }

        this.loading.set(false);
      },
    });
  }
}
