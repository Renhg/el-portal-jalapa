import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  RestaurantProfile,
  RestaurantProfileService
} from '../../core/services/restaurant-profile.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-restaurant-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-profile.html',
  styleUrl: './restaurant-profile.css'
})
export class RestaurantProfilePage implements OnInit {

  profile: RestaurantProfile | null = null;

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  name = '';
  description = '';
  category = '';
  address = '';
  phone = '';

  selectedImage: File | null = null;
  imagePreview: string | null = null;

  private readonly backendUrl = environment.apiUrl;

  constructor(
    private profileService: RestaurantProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;

    this.profileService.getProfile().subscribe({
      next: profile => {
        this.profile = profile;

        this.name = profile.name || '';
        this.description = profile.description || '';
        this.category = profile.category || '';
        this.address = profile.address || '';
        this.phone = profile.phone || '';

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error cargando perfil:', error);

        this.errorMessage =
          error.error?.detail || 'No se pudo cargar el perfil de la tienda.';

        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get currentImage(): string | null {
    if (this.imagePreview) {
      return this.imagePreview;
    }

    if (this.profile?.image_url) {
      return this.profile.image_url.startsWith('http')
        ? this.profile.image_url
        : `${this.backendUrl}${this.profile.image_url}`;
    }

    return null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Selecciona una imagen JPG, PNG, WEBP o GIF.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'La imagen no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.clearImagePreview();

    this.selectedImage = file;
    this.imagePreview = URL.createObjectURL(file);

    this.errorMessage = '';
    this.successMessage = '';
  }

  saveProfile(): void {
    if (this.name.trim().length < 2) {
      this.errorMessage = 'El nombre debe tener al menos 2 caracteres.';
      return;
    }

    const data = new FormData();

    data.append('name', this.name.trim());
    data.append('description', this.description.trim());
    data.append('category', this.category.trim());
    data.append('address', this.address.trim());
    data.append('phone', this.phone.trim());

    if (this.selectedImage) {
      data.append('image', this.selectedImage);
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.updateProfile(data).subscribe({
      next: profile => {
        this.profile = profile;

        this.selectedImage = null;
        this.clearImagePreview();

        this.successMessage = 'Perfil de tienda actualizado correctamente.';
        this.saving = false;

        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error actualizando perfil:', error);

        this.errorMessage =
          error.error?.detail || 'No se pudo actualizar el perfil.';

        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private clearImagePreview(): void {
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
      this.imagePreview = null;
    }
  }
}
