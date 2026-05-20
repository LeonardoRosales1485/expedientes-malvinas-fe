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

  onSelect(): void {
    this.selectExpediente.emit();
  }
}
