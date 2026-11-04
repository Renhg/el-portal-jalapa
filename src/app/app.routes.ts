import { Routes } from '@angular/router';
import { OrderDetail } from './pages/order-detail/order-detail';
import { Home } from './pages/home/home';
import { Restaurants } from './pages/restaurants/restaurants';
import { RestaurantDetail } from './pages/restaurant-detail/restaurant-detail';
import { RestaurantOrders } from './pages/restaurant-orders/restaurant-orders';
import { Cart } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { Orders } from './pages/orders/orders';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { authGuard } from './core/guards/auth.guard';
import { restaurantGuard } from './core/guards/restaurant.guard';
import { RestaurantProducts } from './pages/restaurant-products/restaurant-products';
import { RestaurantProfilePage } from './pages/restaurant-profile/restaurant-profile';
export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'restaurants',
    component: Restaurants
  },
  {
    path: 'restaurants/:id',
    component: RestaurantDetail
  },
  {
    path: 'restaurant/orders',
    component: RestaurantOrders,
    canActivate: [restaurantGuard]
  },
  {
    path: 'cart',
    component: Cart
  },
  {
    path: 'checkout',
    component: Checkout,
    canActivate: [authGuard]
  },
  {
    path: 'orders',
    component: Orders,
    canActivate: [authGuard]
  },
  { path: 'orders/:id',
    component: OrderDetail,
    canActivate: [authGuard]
  },
  {
    path: 'restaurant/products',
    component: RestaurantProducts,
    canActivate: [restaurantGuard]
  },
  {
    path: 'restaurant/profile',
    component: RestaurantProfilePage,
    canActivate: [restaurantGuard]
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: '**',
    redirectTo: ''
  }
];
