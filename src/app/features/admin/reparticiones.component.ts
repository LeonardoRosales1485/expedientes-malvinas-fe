import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReparticionService } from '../../core/services/expediente.service';
import { Reparticion } from '../../core/models';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-reparticiones',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './reparticiones.component.html',
  styleUrl: './reparticiones.component.scss',
})
export class ReparticionesComponent implements OnInit {
  private readonly reparticionService = inject(ReparticionService);

  loading = true;
  reps: Reparticion[] = [];
  editing: Partial<Reparticion> | null = null;
  error = '';
  searchText = '';

  get filteredReps(): Reparticion[] {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.reps;
    return this.reps.filter(
      (r) => r.nombre.toLowerCase().includes(q) || r.sigla.toLowerCase().includes(q),
    );
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reparticionService.listar().subscribe((r) => {
      this.reps = r;
      this.loading = false;
    });
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
