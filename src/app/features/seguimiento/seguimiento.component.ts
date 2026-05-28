import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { ExpedienteService } from '../../core/services/expediente.service';
import { Expediente } from '../../core/models';
import { SeguimientoDetailPanelRestrictivoComponent } from './seguimiento-detail-panel-restrictivo.component';
import { SeguimientoDetailPanelOrientativoComponent } from './seguimiento-detail-panel-orientativo.component';
import { SeguimientoExpedienteCardComponent } from './seguimiento-expediente-card.component';
import { SeguimientoPlaceholderComponent } from './seguimiento-placeholder.component';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [
    SeguimientoExpedienteCardComponent,
    SeguimientoDetailPanelRestrictivoComponent,
    SeguimientoDetailPanelOrientativoComponent,
    SeguimientoPlaceholderComponent,
    FormsModule,
    LoadingSpinnerComponent,
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
  filterEstado = '';
  filterTipo = '';
  loading = false;

  get filteredExpedientes(): Expediente[] {
    const q = this.searchText.toLowerCase().trim();
    return this.expedientes
      .filter((e) => {
        if (q && !e.numeroExpediente?.toLowerCase().includes(q) &&
            !e.caratula.tipoTramite?.toLowerCase().includes(q) &&
            !e.caratula.objeto?.toLowerCase().includes(q)) {
          return false;
        }
        if (this.filterEstado && e.estadoActual !== this.filterEstado) return false;
        if (this.filterTipo && e.circuitoModalidad !== this.filterTipo) return false;
        return true;
      })
      .sort((a, b) => this.fechaReciente(b) - this.fechaReciente(a));
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
    this.expedienteService.listar().subscribe({
      next: (data) => {
        this.loading = false;
        if (!this.filterReparticionId) {
          this.expedientes = data;
          return;
        }
        const rid = this.filterReparticionId;
        this.expedientes = data.filter((exp) =>
          exp.historialSteps?.some((h) => h.reparticionId === rid),
        );
      },
      error: () => (this.loading = false),
    });
  }

  clearFilter(): void {
    this.filterReparticionId = null;
    this.load();
  }

  get selected(): Expediente | null {
    if (!this.selectedId) return null;
    return this.expedientes.find((e) => e.id === this.selectedId) ?? null;
  }

  get esOrientativoLibre(): boolean {
    const m = this.selected?.circuitoModalidad;
    return m === 'ORIENTATIVA' || m === 'LIBRE';
  }

  selectExpediente(id: string): void {
    this.selectedId = id;
  }

  isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  private fechaReciente(exp: Expediente): number {
    const lastStep = exp.historialSteps?.[exp.historialSteps.length - 1];
    const fechaStep = lastStep?.fechaSalida ?? lastStep?.fechaEntrada;
    if (fechaStep) {
      return new Date(fechaStep).getTime() || 0;
    }
    return exp.caratula?.fechaInicio
      ? new Date(exp.caratula.fechaInicio).getTime() || 0
      : 0;
  }
}
