import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { ExpedienteService } from '../../core/services/expediente.service';
import { Expediente } from '../../core/models';
import { SeguimientoDetailPanelComponent } from './seguimiento-detail-panel.component';
import { SeguimientoExpedienteCardComponent } from './seguimiento-expediente-card.component';
import { SeguimientoPlaceholderComponent } from './seguimiento-placeholder.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [
    SeguimientoExpedienteCardComponent,
    SeguimientoDetailPanelComponent,
    SeguimientoPlaceholderComponent,
    RouterLink,
    FormsModule,
    PaginatorComponent,
  ],
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent implements OnInit, OnDestroy {
  private readonly expedienteService = inject(ExpedienteService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly route = inject(ActivatedRoute);

  expedientes: Expediente[] = [];
  selectedId: string | null = null;
  filterReparticionId: string | null = null;
  searchText = '';
  page = 0;
  totalPages = 1;
  totalElements = 0;
  readonly pageSize = 20;
  loading = false;

  get filteredExpedientes(): Expediente[] {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.expedientes;
    return this.expedientes.filter((e) =>
      e.numeroExpediente?.toLowerCase().includes(q) ||
      e.caratula.tipoTramite?.toLowerCase().includes(q) ||
      e.caratula.objeto?.toLowerCase().includes(q),
    );
  }

  ngOnInit(): void {
    this.layoutState.setSeguimientoLayout(true);
    this.filterReparticionId = this.route.snapshot.queryParamMap.get('reparticionId');
    this.load();
  }

  ngOnDestroy(): void {
    this.layoutState.setSeguimientoLayout(false);
  }

  load(): void {
    this.loading = true;
    this.expedienteService.listarPaginado(this.page, this.pageSize).subscribe({
      next: (data: any) => {
        const all: Expediente[] = Array.isArray(data) ? data : (data.content ?? []);
        this.totalPages = Array.isArray(data) ? 1 : (data.totalPages ?? 1);
        this.totalElements = Array.isArray(data) ? data.length : (data.totalElements ?? 0);
        this.loading = false;
        if (!this.filterReparticionId) {
          this.expedientes = all;
          return;
        }
        const rid = this.filterReparticionId;
        this.expedientes = all.filter((exp) =>
          exp.historialSteps?.some((h) => h.reparticionId === rid),
        );
      },
      error: () => (this.loading = false),
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.load();
  }

  clearFilter(): void {
    this.filterReparticionId = null;
    this.load();
  }

  get selected(): Expediente | null {
    if (!this.selectedId) return null;
    return this.expedientes.find((e) => e.id === this.selectedId) ?? null;
  }

  selectExpediente(id: string): void {
    this.selectedId = id;
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }
}
