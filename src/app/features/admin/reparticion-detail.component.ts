import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReparticionService, UserAdminService } from '../../core/services/expediente.service';
import { Reparticion, ReparticionDetalle } from '../../core/models';

@Component({
  selector: 'app-reparticion-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reparticion-detail.component.html',
  styleUrl: './reparticion-detail.component.scss',
})
export class ReparticionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reparticionService = inject(ReparticionService);
  private readonly userAdminService = inject(UserAdminService);

  detalle: ReparticionDetalle | null = null;
  editing = false;
  editForm: Partial<Reparticion> = {};
  showDeleteDialog = false;
  deleteError = '';
  error = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.reparticionService.obtenerDetalle(id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.error = '';
      },
      error: (e) => (this.error = e.error?.message || 'No se pudo cargar la repartición'),
    });
  }

  startEdit(): void {
    if (!this.detalle) return;
    this.editForm = { ...this.detalle.reparticion };
    this.editing = true;
    this.error = '';
  }

  cancelEdit(): void {
    this.editing = false;
    this.error = '';
  }

  guardar(): void {
    if (!this.detalle?.reparticion.id) return;
    if (!this.editForm.nombre?.trim() || !this.editForm.sigla?.trim()) {
      this.error = 'Nombre y sigla son obligatorios';
      return;
    }
    this.reparticionService.actualizar(this.detalle.reparticion.id, this.editForm).subscribe({
      next: () => {
        this.editing = false;
        this.load(this.detalle!.reparticion.id);
      },
      error: (e) => (this.error = e.error?.message || 'Error al guardar'),
    });
  }

  openDelete(): void {
    this.deleteError = '';
    this.showDeleteDialog = true;
    this.error = '';
  }

  closeDelete(): void {
    this.showDeleteDialog = false;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.detalle?.reparticion.id) return;
    this.deleteError = '';
    this.reparticionService.eliminar(this.detalle.reparticion.id).subscribe({
      next: () => this.router.navigate(['/admin/reparticiones']),
      error: (e) => {
        this.deleteError =
          e.error?.message ||
          e.error?.detail ||
          (typeof e.error === 'string' ? e.error : null) ||
          e.message ||
          'No se pudo eliminar';
      },
    });
  }

  suspenderTodos(): void {
    if (!this.detalle?.reparticion.id) return;
    if (!confirm(`¿Suspender todos los usuarios de ${this.detalle.reparticion.sigla}?`)) return;
    this.userAdminService.suspenderReparticion(this.detalle.reparticion.id).subscribe({
      next: () => this.load(this.detalle!.reparticion.id),
      error: (e) => (this.error = e.error?.message || 'Error al suspender'),
    });
  }

  reactivarTodos(): void {
    if (!this.detalle?.reparticion.id) return;
    this.userAdminService.reactivarReparticion(this.detalle.reparticion.id).subscribe({
      next: () => this.load(this.detalle!.reparticion.id),
      error: (e) => (this.error = e.error?.message || 'Error al reactivar'),
    });
  }
}
