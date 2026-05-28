import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CircuitoService, ExpedienteService } from '../../core/services/expediente.service';
import { CircuitoAdministrativo, ModalidadCircuito } from '../../core/models';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-crear-expediente',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './crear-expediente.component.html',
  styleUrl: './crear-expediente.component.scss',
})
export class CrearExpedienteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly circuitoService = inject(CircuitoService);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly router = inject(Router);

  loading = true;
  circuitos: CircuitoAdministrativo[] = [];

  form = this.fb.nonNullable.group({
    circuitoAdministrativoId: ['', Validators.required],
    objeto: ['', Validators.required],
    iniciadorNombre: ['', Validators.required],
    iniciadorDocumento: [''],
  });

  get selectedCircuito(): CircuitoAdministrativo | null {
    const id = this.form.get('circuitoAdministrativoId')?.value;
    return this.circuitos.find((c) => c.id === id) ?? null;
  }

  ngOnInit(): void {
    this.loading = true;
    this.circuitoService.listar().subscribe((c) => {
      this.circuitos = c;
      this.loading = false;
    });
  }

  onCircuitoChange(): void {}

  modalidadIcon(m: ModalidadCircuito): string {
    return { RESTRICTIVA: '🔒', ORIENTATIVA: '💡', LIBRE: '📂' }[m] ?? '';
  }

  termSteps(modalidad: ModalidadCircuito): string {
    return modalidad === 'RESTRICTIVA' ? 'paso' : 'documento';
  }

  stepsLabel(modalidad: ModalidadCircuito, count: number): string {
    const t = this.termSteps(modalidad);
    return `${count} ${t}${count !== 1 ? 's' : ''}`;
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const circuito = this.circuitos.find((c) => c.id === v.circuitoAdministrativoId);
    this.expedienteService
      .crear({
        circuitoAdministrativoId: v.circuitoAdministrativoId,
        caratula: {
          objeto: v.objeto,
          tipoTramite: circuito?.nombre ?? '',
          iniciador: {
            tipo: 'INTERNO',
            nombre: v.iniciadorNombre,
            documento: v.iniciadorDocumento,
          },
        },
      })
      .subscribe((exp) => this.router.navigate(['/expedientes', exp.id]));
  }
}
