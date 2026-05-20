import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CircuitoService, ExpedienteService } from '../../core/services/expediente.service';
import { CircuitoAdministrativo } from '../../core/models';

@Component({
  selector: 'app-crear-expediente',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './crear-expediente.component.html',
  styleUrl: './crear-expediente.component.scss',
})
export class CrearExpedienteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly circuitoService = inject(CircuitoService);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly router = inject(Router);

  circuitos: CircuitoAdministrativo[] = [];

  form = this.fb.nonNullable.group({
    circuitoAdministrativoId: ['', Validators.required],
    objeto: ['', Validators.required],
    iniciadorNombre: ['', Validators.required],
    iniciadorDocumento: [''],
  });

  ngOnInit(): void {
    this.circuitoService.listar().subscribe((c) => (this.circuitos = c));
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
