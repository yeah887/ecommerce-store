import { Component, computed } from '@angular/core';
import { httpResource, HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { HealthResponse } from '@store/shared';

type HealthView = 'loading' | 'healthy' | 'degraded' | 'unreachable';

/** Temporary home page: shows whether the API and its database are up. */
@Component({
  selector: 'app-health-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './health-page.html',
})
export class HealthPage {
  protected readonly health = httpResource<HealthResponse>(() => '/api/health');

  protected readonly view = computed<HealthView>(() => {
    if (this.health.isLoading()) return 'loading';
    if (this.health.hasValue()) return 'healthy';
    // A 503 from the API still carries a HealthResponse body: the API is up, the database is not.
    const error = this.health.error();
    if (error instanceof HttpErrorResponse && error.status === 503) return 'degraded';
    return 'unreachable';
  });
}
