

import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  get currentUser(): AuthUser | null {
    return this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
