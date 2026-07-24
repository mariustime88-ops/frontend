import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppNotificationService, AppNotification } from '@app/cores/services/app-notification.service';

@Component({
  selector: 'app-notifications-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-modal.component.html',
  styleUrl: './notifications-modal.component.scss',
})
export class NotificationsModalComponent {
  private _visible = false;

  @Input()
  set visible(v: boolean) {
    this._visible = v;
    if (v) this.svc.loadNotifications(50);
  }
  get visible(): boolean { return this._visible; }

  @Output() visibleChange = new EventEmitter<boolean>();

  private svc = inject(AppNotificationService);

  notifications$ = this.svc.notifications$;
  loading$ = this.svc.loading$;
  onlyUnread = false;

  get filtered(): AppNotification[] {
    const all = this.notifications$.value;
    return this.onlyUnread ? all.filter((n) => !n.is_read) : all;
  }

  markRead(n: AppNotification): void {
    if (!n.is_read) this.svc.markAsRead(n.id);
  }

  markAllRead(): void {
    this.svc.markAllAsRead();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  timeAgo(d: string): string { return this.svc.timeAgo(d); }
  iconFor(t: string): string  { return this.svc.iconFor(t); }
  colorFor(t: string): string { return this.svc.colorFor(t); }
}
