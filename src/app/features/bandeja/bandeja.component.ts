import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CircuitoService, ExpedienteService } from '../../core/services/expediente.service';
import { AuthService } from '../../core/services/auth.service';
import { CircuitoAdministrativo, Expediente, HistorialStep } from '../../core/models';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';

@Component({
  selector: 'app-bandeja',
  standalone: true,
  imports: [RouterLink, FormsModule, EstadoLabelPipe],
  templateUrl: './bandeja.component.html',
  styleUrl: './bandeja.component.scss',
})
export class BandejaComponent implements OnInit {
  private readonly expedienteService = inject(ExpedienteService);
  private readonly circuitoService = inject(CircuitoService);
  private readonly auth = inject(AuthService);

  private readonly allTareas = signal<Expediente[]>([]);
  readonly filteredTareas = computed(() => {
    const activeRep = this.auth.activeReparticionId();
    const all = this.allTareas();
    if (!activeRep) return all;
    return all.filter((exp) => {
      const step = this.currentStep(exp);
      return step?.reparticionId === activeRep;
    });
  });

  circuitos: CircuitoAdministrativo[] = [];
  loading = true;

  filterCircuito = '';
  filterEstado = '';
  filterVencimiento = '';

  ngOnInit(): void {
    this.circuitoService.listar().subscribe((c) => (this.circuitos = c));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.expedienteService
      .bandeja({
        circuitoId: this.filterCircuito || undefined,
        estado: this.filterEstado || undefined,
        vencimiento: this.filterVencimiento || undefined,
      })
      .subscribe({
        next: (data) => {
          this.allTareas.set(data);
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  currentStep(exp: Expediente): HistorialStep | undefined {
    return (
      exp.historialSteps.findLast(
        (h) => h.stepOrder === exp.stepActual && h.estado === 'pendiente',
      ) ?? exp.historialSteps.findLast((h) => h.stepOrder === exp.stepActual)
    );
  }

  pasoActualLabel(exp: Expediente): string {
    return this.currentStep(exp)?.nombreStep ?? String(exp.stepActual);
  }

  badgeClass(estado: string, vencimiento?: string): string {
    if (vencimiento === 'vencido' || estado === 'VENCIDO') return 'danger';
    if (vencimiento === 'proximoVencer') return 'warn';
    if (estado === 'OBSERVADO') return 'warn';
    return 'info';
  }
}
