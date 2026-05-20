import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Expediente } from '../../core/models';
import { VerticalStepperComponent } from '../../shared/vertical-stepper/vertical-stepper.component';
import { buildSeguimientoSteps, pasoActualLabel } from './seguimiento-steps.util';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';

@Component({
  selector: 'app-seguimiento-detail-panel',
  standalone: true,
  imports: [RouterLink, VerticalStepperComponent, EstadoLabelPipe],
  templateUrl: './seguimiento-detail-panel.component.html',
  styleUrl: './seguimiento-detail-panel.component.scss',
})
export class SeguimientoDetailPanelComponent {
  @Input({ required: true }) expediente!: Expediente;

  get steps() {
    return buildSeguimientoSteps(this.expediente);
  }

  get stepsCompletos(): number {
    return this.expediente.historialSteps.filter((h) => h.estado === 'completado').length;
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
}
