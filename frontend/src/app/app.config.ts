import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';
import { credentialsInterceptor } from './auth/credentials.interceptor';
import { I18n } from './i18n/i18n';
import { TranslatedTitleStrategy } from './i18n/title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),
    // Know who is logged in before the first route renders, so guards and the header are right.
    provideAppInitializer(() => inject(AuthService).refresh()),
    // Load the saved or browser language before the first render, so nothing flashes in English.
    provideAppInitializer(() => inject(I18n).init()),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
  ],
};
