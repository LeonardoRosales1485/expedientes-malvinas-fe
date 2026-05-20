import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { ExpedienteService } from '../../core/services/expediente.service';
import { Expediente } from '../../core/models';
import { SeguimientoDetailPanelComponent } from './seguimiento-detail-panel.component';
import { SeguimientoExpedienteCardComponent } from './seguimiento-expediente-card.component';
import { SeguimientoPlaceholderComponent } from './seguimiento-placeholder.component';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [
    SeguimientoExpedienteCardComponent,
    SeguimientoDetailPanelComponent,
    SeguimientoPlaceholderComponent,
    RouterLink,
    FormsModule,
  ],
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent implements OnInit, OnDestroy {
  private readonly expedienteService = inject(ExpedienteService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly route = inject(ActivatedRoute);

  private allExpedientes: Expediente[] = [];
  expedientes: Expediente[] = [];
  selectedId: string | null = null;
  filterReparticionId: string | null = null;
  searchText = '';

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
    this.expedienteService.listar().subscribe((e) => {
      this.allExpedientes = e;
      this.applyFilter();
    });
  }

  ngOnDestroy(): void {
    this.layoutState.setSeguimientoLayout(false);
  }

  private applyFilter(): void {
    if (!this.filterReparticionId) {
      this.expedientes = this.allExpedientes;
      return;
    }
    const rid = this.filterReparticionId;
    this.expedientes = this.allExpedientes.filter((exp) =>
      exp.historialSteps.some((h) => h.reparticionId === rid),
    );
  }

  clearFilter(): void {
    this.filterReparticionId = null;
    this.expedientes = this.allExpedientes;
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
