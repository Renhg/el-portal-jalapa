

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { CartItem } from '../../core/models/cart-item.model';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('deliveryMap')
  deliveryMap?: ElementRef<HTMLDivElement>;

  items: CartItem[] = [];
  total = 0;

  address = '';
  phone = '';
  paymentMethod = 'Efectivo';

  latitude: number | null = null;
  longitude: number | null = null;

  locationLoading = false;
  locationMessage = '';

  loading = false;
  errorMessage = '';

  private map?: L.Map;
  private marker?: L.Marker;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.items = this.cartService.getItems();
    this.total = this.cartService.getTotal();
  }

  ngAfterViewInit(): void {
    if (!this.deliveryMap) return;

    const initialPosition: L.LatLngExpression = [15.4700, -90.3700];

    this.map = L.map(this.deliveryMap.nativeElement)
      .setView(initialPosition, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.setLocation(event.latlng.lat, event.latlng.lng);
      this.locationMessage = 'Ubicación seleccionada en el mapa.';
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private setLocation(
    latitude: number,
    longitude: number,
    zoom = 16
  ): void {
    this.latitude = latitude;
    this.longitude = longitude;

    this.map?.setView([latitude, longitude], zoom);

    if (!this.map) return;

    if (!this.marker) {
      this.marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: L.divIcon({
          className: 'custom-delivery-marker',
          html: '<span style="font-size:32px;line-height:32px;">📍</span>',
          iconSize: [32, 32],
          iconAnchor: [16, 30]
        })
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const position = this.marker?.getLatLng();

        if (position) {
          this.latitude = position.lat;
          this.longitude = position.lng;
          this.locationMessage = 'Ubicación ajustada correctamente.';
        }
      });
    } else {
      this.marker.setLatLng([latitude, longitude]);
    }
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationMessage =
        'Tu navegador no permite obtener la ubicación.';
      return;
    }

    this.locationLoading = true;
    this.locationMessage = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locationLoading = false;

        this.setLocation(
          position.coords.latitude,
          position.coords.longitude
        );

        this.locationMessage =
          'Tu ubicación actual fue seleccionada. Puedes mover el marcador.';
      },
      (error) => {
        this.locationLoading = false;

        if (error.code === error.PERMISSION_DENIED) {
          this.locationMessage =
            'No se concedió permiso para acceder a tu ubicación.';
        } else if (error.code === error.TIMEOUT) {
          this.locationMessage =
            'La ubicación tardó demasiado. Inténtalo nuevamente.';
        } else {
          this.locationMessage =
            'No fue posible obtener tu ubicación.';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  confirmOrder(): void {
    if (this.loading) return;

    this.errorMessage = '';

    if (!this.items.length) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    if (!this.address.trim() || !this.phone.trim()) {
      this.errorMessage = 'Completa la dirección y el teléfono.';
      return;
    }

    const restaurantIds = new Set(
      this.items.map(item => item.product.restaurantId)
    );

    if (restaurantIds.size !== 1) {
      this.errorMessage =
        'Para realizar el pedido, todos los productos deben ser del mismo restaurante.';
      return;
    }

    this.loading = true;

    this.orderService.createOrder({
      items: this.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      address: this.address.trim(),
      phone: this.phone.trim(),
      payment_method:
        this.paymentMethod === 'Tarjeta' ? 'TARJETA' : 'EFECTIVO',
      latitude: this.latitude,
      longitude: this.longitude
    }).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.loading = false;
        this.router.navigate(['/orders']);
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Tu sesión expiró. Inicia sesión nuevamente.';
        } else if (error.status === 422) {
          this.errorMessage =
            error.error?.detail ?? 'Los datos del pedido no son válidos.';
        } else {
          this.errorMessage =
            'No se pudo guardar el pedido. Revisa tu conexión e inténtalo de nuevo.';
        }
      }
    });
  }
}
