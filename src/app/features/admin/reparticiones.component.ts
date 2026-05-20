import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReparticionService } from '../../core/services/expediente.service';
import { Reparticion } from '../../core/models';

@Component({
  selector: 'app-reparticiones',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reparticiones.component.html',
  styleUrl: './reparticiones.component.scss',
})
export class ReparticionesComponent implements OnInit {
  private readonly reparticionService = inject(ReparticionService);

  reps: Reparticion[] = [];
  editing: Partial<Reparticion> | null = null;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.reparticionService.listar().subscribe((r) => (this.reps = r));
  }

  nuevo(): void {
    this.editing = { nombre: '', sigla: '', descripcion: '' };
    this.error = '';
  }

  cancelar(): void {
    this.editing = null;
    this.error = '';
  }

  guardar(): void {
    if (!this.editing?.nombre?.trim() || !this.editing?.sigla?.trim()) {
      this.error = 'Nombre y sigla son obligatorios';
      return;
    }
    const req = this.editing.id
      ? this.reparticionService.actualizar(this.editing.id, this.editing)
      : this.reparticionService.crear(this.editing);
    req.subscribe({
      next: () => {
        this.cancelar();
        this.load();
      },
      error: (e) => (this.error = e.error?.message || 'Error al guardar'),
    });
  }

}
