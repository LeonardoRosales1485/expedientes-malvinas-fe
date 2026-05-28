import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CircuitoAdministrativo, Expediente, HistorialStep } from '../../core/models';
import { CircuitoService } from '../../core/services/expediente.service';
import { VerticalStepperComponent, VerticalStepView } from '../../shared/vertical-stepper/vertical-stepper.component';
import {
  buildSeguimientoStepsFromArray,
  pasoActualLabel,
} from './seguimiento-steps.util';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';

@Component({
  selector: 'app-seguimiento-detail-panel-orientativo',
  standalone: true,
  imports: [RouterLink, VerticalStepperComponent, EstadoLabelPipe],
  templateUrl: './seguimiento-detail-panel-orientativo.component.html',
  styleUrl: './seguimiento-detail-panel-orientativo.component.scss',
})
export class SeguimientoDetailPanelOrientativoComponent implements OnInit {
  private readonly circuitoService = inject(CircuitoService);

  @Input({ required: true }) expediente!: Expediente;

  circuito: CircuitoAdministrativo | null = null;

  /** Paso seleccionado para ver detalle inline */
  selectedStepOrder: number | null = null;

  /** HistorialStep[] con TODOS los steps del circuito */
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
        estado: s.order < this.expediente!.stepActual ? 'completado' : 'pendiente',
        plazoDias: s.plazoDias,
      } as HistorialStep;
    });
  }

  /** VerticalStepView[] — todos clickeables */
  get steps(): VerticalStepView[] {
    return buildSeguimientoStepsFromArray(this.displaySteps, this.expediente.stepActual);
  }

  get stepsCompletos(): number {
    return this.displaySteps.filter((h) => h.estado === 'completado').length;
  }

  get selectedStep(): HistorialStep | null {
    if (this.selectedStepOrder === null) return null;
    return this.displaySteps.find((s) => s.stepOrder === this.selectedStepOrder) ?? null;
  }

  get selectedStepView(): VerticalStepView | null {
    if (this.selectedStepOrder === null) return null;
    return this.steps.find((s) => s.stepOrder === this.selectedStepOrder) ?? null;
  }

  get selectedStepFormEntries(): { key: string; value: unknown }[] {
    if (!this.selectedStep?.datosFormulario) return [];
    return Object.entries(this.selectedStep.datosFormulario).map(([key, value]) => ({ key, value }));
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
    this.selectedStepOrder = stepOrder;
  }

  clearSelection(): void {
    this.selectedStepOrder = null;
  }
}
