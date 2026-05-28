import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CircuitoAdministrativo, Expediente, HistorialStep } from '../../core/models';
import { CircuitoService } from '../../core/services/expediente.service';
import { VerticalStepperComponent, VerticalStepView } from '../../shared/vertical-stepper/vertical-stepper.component';
import {
  buildSeguimientoStepsFromArray,
  pasoActualLabel,
} from './seguimiento-steps.util';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';

@Component({
  selector: 'app-seguimiento-detail-panel-restrictivo',
  standalone: true,
  imports: [RouterLink, VerticalStepperComponent, EstadoLabelPipe],
  templateUrl: './seguimiento-detail-panel-restrictivo.component.html',
  styleUrl: './seguimiento-detail-panel-restrictivo.component.scss',
})
export class SeguimientoDetailPanelRestrictivoComponent implements OnInit {
  private readonly circuitoService = inject(CircuitoService);
  private readonly router = inject(Router);

  @Input({ required: true }) expediente!: Expediente;

  circuito: CircuitoAdministrativo | null = null;

  /** HistorialStep[] con TODOS los steps del circuito (completados, actual, y futuros pendientes) */
  get displaySteps(): HistorialStep[] {
    if (!this.expediente || !this.circuito) return this.expediente?.historialSteps ?? [];
    return this.circuito.steps.map((s) => {
      const h = this.expediente!.historialSteps.find((hs) => hs.stepOrder === s.order);
      if (h) return h;
      return {
        stepOrder: s.order,
        reparticionId: s.reparticionId,
        nombreStep: s.nombre,
        tipoAccion: s.tipoAccion,
        estado: 'pendiente',
        plazoDias: s.plazoDias,
      } as HistorialStep;
    });
  }

  /** VerticalStepView[] — solo el paso actual es clickable */
  get steps(): VerticalStepView[] {
    const views = buildSeguimientoStepsFromArray(this.displaySteps, this.expediente.stepActual);
    return views.map((v) => ({
      ...v,
      disabled: v.stepOrder !== this.expediente.stepActual,
    }));
  }

  get stepsCompletos(): number {
    return this.displaySteps.filter((h) => h.estado === 'completado').length;
  }

  get pasoActual(): string | null {
    return pasoActualLabel(this.expediente);
  }

  get iniciadorNombre(): string | null {
    return this.expediente.caratula.iniciador?.nombre ?? null;
  }

  get iniciadorDocumento(): string | null {
    return this.expediente.caratula.iniciador?.documento ?? null;
  }

  get circuitoTipo(): string | null {
    const m = this.expediente.circuitoModalidad;
    if (m === 'RESTRICTIVA') return 'Restrictivo';
    if (m === 'ORIENTATIVA') return 'Orientativo';
    if (m === 'LIBRE') return 'Libre';
    return null;
  }

  get circuitoTipoClass(): string {
    const m = this.expediente.circuitoModalidad;
    if (m === 'RESTRICTIVA') return 'restrictiva';
    if (m === 'ORIENTATIVA') return 'orientativa';
    if (m === 'LIBRE') return 'libre';
    return '';
  }

  ngOnInit(): void {
    this.loadCircuito();
  }

  private loadCircuito(): void {
    this.circuitoService.obtener(this.expediente.circuitoAdministrativoId).subscribe({
      next: (c) => (this.circuito = c),
      error: () => (this.circuito = null),
    });
  }

  onStepClick(stepOrder: number): void {
    // Solo permitir click en el paso actual
    if (stepOrder !== this.expediente.stepActual) return;
    // Navegar al detalle del expediente
    this.router.navigate(['/expedientes', this.expediente.id]);
  }
}
