import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, interval, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { PermissionService } from '../core/services/permission.service';
import { LayoutStateService } from '../core/services/layout-state.service';
import { ExpedienteService, NotificationService, ReparticionService } from '../core/services/expediente.service';
import { Expediente, Notification, Reparticion } from '../core/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, FormsModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly perm = inject(PermissionService);
  readonly layoutState = inject(LayoutStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly reparticionService = inject(ReparticionService);
  private readonly expedienteService = inject(ExpedienteService);
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
  searchText = '';
  searchResults: Expediente[] = [];
  showSearch = false;
  private pollSub?: Subscription;
  private routerSub?: Subscription;
  private searchSub?: Subscription;
  private readonly searchInput$ = new Subject<string>();

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
        this.closeSearch();
      });

    this.searchSub = this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe((q) => {
      if (q.trim().length < 2) { this.searchResults = []; return; }
      this.expedienteService.buscar(q).subscribe((r) => {
        this.searchResults = r.slice(0, 8);
      });
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.searchSub?.unsubscribe();
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

  onSearchInput(q: string): void {
    this.showSearch = true;
    this.searchInput$.next(q);
  }

  closeSearch(): void {
    this.showSearch = false;
    this.searchText = '';
    this.searchResults = [];
  }

  navigateToExpediente(id: string): void {
    this.closeSearch();
    this.router.navigate(['/expedientes', id]);
  }

  logout(): void {
    this.sidebarOpen = false;
    this.auth.logout();
  }
}
