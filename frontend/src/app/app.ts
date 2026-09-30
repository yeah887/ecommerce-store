import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './auth/auth.service';
import { CartStore } from './cart/cart-store';
import { I18n } from './i18n/i18n';
import { SettingsStore } from './settings/settings-store';
import { TranslatePipe, TranslatePluralPipe } from './i18n/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatIconModule, MatMenuModule, TranslatePipe, TranslatePluralPipe],
  templateUrl: './app.html',
})
export class App {
  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18n);
  protected readonly settings = inject(SettingsStore);
  protected readonly currentLanguageName = computed(
    () => this.i18n.languages.find((language) => language.code === this.i18n.language())!.name,
  );
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
      this.snackBar.open(this.i18n.t('auth.loggedOut'), undefined, { duration: 3000 });
      await this.router.navigateByUrl('/');
    } catch {
      this.snackBar.open(this.i18n.t('auth.logoutFailed'), undefined, { duration: 4000 });
    }
  }
}
