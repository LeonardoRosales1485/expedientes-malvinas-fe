import { Component, Input, computed, input } from '@angular/core';
import { CircuitoAdministrativo, Expediente, HistorialStep, PasoCircuito } from '../../core/models';

interface NodoDiagrama {
  paso: PasoCircuito;
  historial: HistorialStep[];
  estadoClase: 'pending' | 'active' | 'done' | 'returned' | 'expired';
  etiquetaEstado: string;
}

@Component({
  selector: 'app-circuito-progress',
  standalone: true,
  templateUrl: './circuito-progress.component.html',
  styleUrl: './circuito-progress.component.scss',
})
export class CircuitoProgressComponent {
  @Input({ required: true }) circuito!: CircuitoAdministrativo;
  @Input({ required: true }) expediente!: Expediente;

  get nodos(): NodoDiagrama[] {
    if (!this.circuito || !this.expediente) return [];
    return [...this.circuito.steps]
      .sort((a, b) => a.order - b.order)
      .map((paso) => {
        const historial = this.expediente.historialSteps.filter(
          (h) => h.stepOrder === paso.order,
        );
        return {
          paso,
          historial,
          ...this.resolverEstado(paso, historial),
        };
      });
  }

  private resolverEstado(
    paso: PasoCircuito,
    historial: HistorialStep[],
  ): { estadoClase: NodoDiagrama['estadoClase']; etiquetaEstado: string } {
    const exp = this.expediente;
    if (!historial.length) return { estadoClase: 'pending', etiquetaEstado: 'Pendiente' };

    const ultimo = historial[historial.length - 1];
    if (ultimo.vencido) return { estadoClase: 'expired', etiquetaEstado: 'Vencido' };
    if (ultimo.estado === 'observado') return { estadoClase: 'returned', etiquetaEstado: 'Devuelto' };
    if (ultimo.estado === 'completado') return { estadoClase: 'done', etiquetaEstado: 'Completado' };
    if (paso.order === exp.stepActual) return { estadoClase: 'active', etiquetaEstado: 'En curso' };
    return { estadoClase: 'pending', etiquetaEstado: 'Pendiente' };
  }

  tipoIcono(tipo: string): string {
    const map: Record<string, string> = {
      FILE_UPLOAD: '📎',
      FORM: '📝',
      APPROVAL: '✅',
    };
    return map[tipo] ?? '•';
  }
}
