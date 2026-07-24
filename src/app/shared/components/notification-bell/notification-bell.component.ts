import { Component, OnDestroy, OnInit, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotificationService, AppNotification } from '@app/cores/services/app-notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private svc = inject(AppNotificationService);
  private el = inject(ElementRef);

  open = false;

  counts$ = this.svc.counts$;
  notifications$ = this.svc.notifications$;
  loading$ = this.svc.loading$;

  ngOnInit(): void {
    this.svc.startPolling();
  }

  ngOnDestroy(): void {
    this.svc.stopPolling();
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.svc.loadNotifications(15);
    }
  }

  markAllRead(): void {
    this.svc.markAllAsRead();
  }

  markRead(n: AppNotification): void {
    if (!n.is_read) {
      this.svc.markAsRead(n.id);
    }
  }

  timeAgo(d: string): string {
    return this.svc.timeAgo(d);
  }

  iconFor(type: string): string {
    return this.svc.iconFor(type);
  }

  colorFor(type: string): string {
    return this.svc.colorFor(type);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
