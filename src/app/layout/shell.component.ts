import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { PermissionService } from '../core/services/permission.service';
import { LayoutStateService } from '../core/services/layout-state.service';
import { NotificationService, ReparticionService } from '../core/services/expediente.service';
import { Notification, Reparticion } from '../core/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly perm = inject(PermissionService);
  readonly layoutState = inject(LayoutStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly reparticionService = inject(ReparticionService);
  private readonly router = inject(Router);

  @HostBinding('class.shell--circuito-editor')
  get circuitoEditorOpen(): boolean {
    return this.layoutState.circuitoEditorOpen();
  }

  @HostBinding('class.shell--layout-locked')
  get layoutLocked(): boolean {
    return this.layoutState.isMainViewportLocked();
  }

  get mainNoScroll(): boolean {
    return this.layoutState.isMainViewportLocked();
  }

  notifications: Notification[] = [];
  userReparticiones: Reparticion[] = [];
  showPanel = false;
  sidebarOpen = false;
  private pollSub?: Subscription;
  private routerSub?: Subscription;

  ngOnInit(): void {
    this.loadNotifications();
    this.pollSub = interval(30_000)
      .pipe(switchMap(() => this.notificationService.listar()))
      .subscribe((n) => (this.notifications = n));
    this.loadUserReparticiones();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.sidebarOpen = false;
        this.showPanel = false;
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  loadUserReparticiones(): void {
    const ids = this.auth.currentUser()?.reparticionesIds ?? [];
    if (ids.length <= 1) return;
    this.reparticionService.listar().subscribe((all) => {
      this.userReparticiones = all.filter((r) => ids.includes(r.id));
    });
  }

  setActiveReparticion(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.auth.setActiveReparticion(value || null);
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.leida).length;
  }

  loadNotifications(): void {
    this.notificationService.listar().subscribe((n) => (this.notifications = n));
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    if (!this.sidebarOpen) this.showPanel = false;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    this.showPanel = false;
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
    if (this.showPanel) this.loadNotifications();
  }

  marcarLeida(n: Notification, event: Event): void {
    event.stopPropagation();
    if (n.leida) return;
    this.notificationService.marcarLeida(n.id).subscribe(() => {
      n.leida = true;
    });
  }

  logout(): void {
    this.sidebarOpen = false;
    this.auth.logout();
  }
}
