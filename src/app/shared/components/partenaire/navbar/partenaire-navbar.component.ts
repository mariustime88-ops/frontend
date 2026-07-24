import { Component, EnvironmentInjector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { GlobalConfig } from '@app/app.config';
import { User } from '@app/cores/types/user';
import { getDefaultUser } from '@app/cores/utils/get-user';
import { AdminConfigService, DataPeriod, PeriodDeadlineStatus } from '@app/pages/admin/config/admin-config.service';
import { NotificationBellComponent } from '@app/shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-partenaire-navbar',
  imports: [CommonModule, NotificationBellComponent],
  templateUrl: './partenaire-navbar.component.html',
  styleUrl: './partenaire-navbar.component.scss',
})
export class PartenaireNavbarComponent implements OnInit {
  appName: string = "Gestion des indicateurs de la Protection de l'Enfant | UNICEF - Bénin";
  user: User = {} as User;
  currentPeriod: DataPeriod | null = null;
  deadline: PeriodDeadlineStatus | null = null;

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private injector: EnvironmentInjector,
    private svc: AdminConfigService
  ) {}

  ngOnInit(): void {
    this.user = getDefaultUser(this.injector);
    this.svc.getCurrentPeriodStatus().subscribe({
      next: (data) => {
        if (data) {
          this.currentPeriod = data.period;
          this.deadline = data.deadline;
        }
      }
    });
  }

  get statusColor(): string {
    if (!this.deadline) return 'period-chip--inactive';
    const map: Record<string, string> = {
      ok: 'period-chip--ok',
      approaching: 'period-chip--approaching',
      warning: 'period-chip--warning',
      critical: 'period-chip--critical',
      expired: 'period-chip--expired',
      no_deadline: 'period-chip--ok',
    };
    return map[this.deadline.status] ?? 'period-chip--ok';
  }

  get statusLabel(): string {
    if (!this.deadline) return '';
    const map: Record<string, string> = {
      ok: 'Ouvert',
      approaching: 'Bientôt',
      warning: 'Urgent',
      critical: 'Critique',
      expired: 'Fermé',
      no_deadline: 'Ouvert',
    };
    return map[this.deadline.status] ?? '';
  }

  readonly levelLabel = 'Partenaire';
  readonly levelColor = '#6366f1';

  formatDate(d: string | null): string {
    if (!d) return '-';
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(d));
  }

  logout() {
    this.cookieService.delete(GlobalConfig.token);
    this.cookieService.delete(GlobalConfig.user);
    localStorage.removeItem(GlobalConfig.permissions);
    this.router.navigate(['/login']);
  }
}
