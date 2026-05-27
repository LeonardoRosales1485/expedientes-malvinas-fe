import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Expediente } from '../../core/models';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';

@Component({
  selector: 'app-seguimiento-expediente-card',
  standalone: true,
  imports: [EstadoLabelPipe],
  templateUrl: './seguimiento-expediente-card.component.html',
  styleUrl: './seguimiento-expediente-card.component.scss',
})
export class SeguimientoExpedienteCardComponent {
  @Input({ required: true }) expediente!: Expediente;
  @Input() selected = false;
  @Output() selectExpediente = new EventEmitter<void>();

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

  onSelect(): void {
    this.selectExpediente.emit();
  }
}
