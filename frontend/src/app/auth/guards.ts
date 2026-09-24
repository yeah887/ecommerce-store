import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './return-url';

/** Login and register pages: someone already logged in goes straight on. */
export const guestOnlyGuard: CanActivateFn = (route) => {
  if (!inject(AuthService).isLoggedIn()) return true;
  return inject(Router).parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')));
};

/** Pages for logged-in users: others are sent to log in and brought back afterwards. */
export const loggedInGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
