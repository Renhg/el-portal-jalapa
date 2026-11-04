

import { Component, OnInit,   ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-restaurant-products',
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-products.html',
  styleUrl: './restaurant-products.css'
})
export class RestaurantProducts implements OnInit {

  products: Product[] = [];

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  editingProduct: Product | null = null;

  name = '';
  description = '';
  price: number | null = null;
  category = '';

  selectedImage: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.productService.getMyRestaurantProducts().subscribe({
      next: products => {
        this.products = products;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Error cargando productos:', error);
        this.errorMessage = 'No se pudieron cargar los productos.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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
  }

  saveProduct(): void {
    if (
      !this.name.trim() ||
      !this.category.trim() ||
      this.price === null ||
      this.price <= 0
    ) {
      this.errorMessage = 'Completa los campos obligatorios correctamente.';
      return;
    }

    const data = new FormData();

    data.append('name', this.name.trim());
    data.append('description', this.description.trim());
    data.append('price', String(this.price));
    data.append('category', this.category.trim());

    if (this.selectedImage) {
      data.append('image', this.selectedImage);
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = this.editingProduct
      ? this.productService.updateProduct(this.editingProduct.id, data)
      : this.productService.createProduct(data);

    request.subscribe({
      next: () => {
        const wasEditing = this.editingProduct !== null;

        this.successMessage = wasEditing
          ? 'Producto actualizado correctamente.'
          : 'Producto creado correctamente.';

        this.resetForm();
        this.saving = false;

        this.cdr.detectChanges();

        this.loadProducts();
      },
      error: error => {
        console.error('Error guardando producto:', error);

        this.errorMessage =
          error.error?.detail || 'No se pudo guardar el producto.';

        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  editProduct(product: Product): void {
    this.editingProduct = product;

    this.name = product.name;
    this.description = product.description;
    this.price = product.price;
    this.category = product.category;

    this.selectedImage = null;
    this.clearImagePreview();

    this.errorMessage = '';
    this.successMessage = '';

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  deactivateProduct(product: Product): void {
    const confirmed = window.confirm(
      `¿Deseas desactivar el producto "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.productService.deactivateProduct(product.id).subscribe({
      next: () => {
        this.successMessage = 'Producto desactivado correctamente.';
        this.loadProducts();
      },
      error: error => {
        console.error('Error desactivando producto:', error);
        this.errorMessage = 'No se pudo desactivar el producto.';
      }
    });
  }

  resetForm(): void {
    this.editingProduct = null;

    this.name = '';
    this.description = '';
    this.price = null;
    this.category = '';

    this.selectedImage = null;
    this.clearImagePreview();
  }

  cancelEdit(): void {
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearImagePreview(): void {
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
      this.imagePreview = null;
    }
  }
}
