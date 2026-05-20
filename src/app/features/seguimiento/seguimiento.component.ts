import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
  ],
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent implements OnInit, OnDestroy {
  private readonly expedienteService = inject(ExpedienteService);
  private readonly layoutState = inject(LayoutStateService);
  expedientes: Expediente[] = [];
  selectedId: string | null = null;

  ngOnInit(): void {
    this.layoutState.setSeguimientoLayout(true);
    this.expedienteService.listar().subscribe((e) => (this.expedientes = e));
  }

  ngOnDestroy(): void {
    this.layoutState.setSeguimientoLayout(false);
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
