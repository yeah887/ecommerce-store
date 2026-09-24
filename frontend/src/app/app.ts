import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './auth/auth.service';
import { CartStore } from './cart/cart-store';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
      this.snackBar.open('You are logged out', undefined, { duration: 3000 });
      await this.router.navigateByUrl('/');
    } catch {
      this.snackBar.open("Couldn't log out. Please try again.", undefined, { duration: 4000 });
    }
  }
}
