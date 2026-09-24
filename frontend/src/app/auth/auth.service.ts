import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { LoginRequest, PublicUser, RegisterRequest } from '@store/shared';

/** The logged-in user. The server session (httpOnly cookie) is the source of truth. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<PublicUser | null>(null);

  readonly user = this.current.asReadonly();
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly isAdmin = computed(() => this.current()?.role === 'admin');

  /** Asks the server who is logged in. Called once on startup. */
  async refresh(): Promise<void> {
    try {
      this.current.set(await firstValueFrom(this.http.get<PublicUser>('/api/auth/me')));
    } catch (error) {
      this.current.set(null);
      // 401 just means "not logged in"; anything else (API down) shouldn't block startup either.
      if (!(error instanceof HttpErrorResponse)) throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<PublicUser> {
    const user = await firstValueFrom(this.http.post<PublicUser>('/api/auth/login', credentials));
    this.current.set(user);
    return user;
  }

  async register(details: RegisterRequest): Promise<PublicUser> {
    const user = await firstValueFrom(this.http.post<PublicUser>('/api/auth/register', details));
    this.current.set(user);
    return user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
    this.current.set(null);
  }
}
