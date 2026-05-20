import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlantillaActo } from '../../core/models';
import { PlantillaService } from '../../core/services/expediente.service';

@Component({
  selector: 'app-plantillas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plantillas.component.html',
  styleUrl: './plantillas.component.scss',
})
export class PlantillasComponent implements OnInit {
  private readonly svc = inject(PlantillaService);

  plantillas: PlantillaActo[] = [];
  editing: Partial<PlantillaActo> | null = null;
  saving = false;

  readonly TIPOS = ['DECRETO', 'RESOLUCIÓN', 'DISPOSICIÓN'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.svc.listar().subscribe((p) => (this.plantillas = p));
  }

  nueva(): void {
    this.editing = { nombre: '', tipoActo: 'DECRETO', cuerpoHtml: '' };
  }

  editar(p: PlantillaActo): void {
    this.editing = { ...p };
  }

  cancelar(): void {
    this.editing = null;
  }

  guardar(): void {
    if (!this.editing) return;
    this.saving = true;
    const body = this.editing as PlantillaActo;
    const op$ = body.id
      ? this.svc.actualizar(body.id, body)
      : this.svc.crear(body);
    op$.subscribe({
      next: () => {
        this.saving = false;
        this.editing = null;
        this.cargar();
      },
      error: () => (this.saving = false),
    });
  }

  eliminar(p: PlantillaActo): void {
    if (!p.id || !confirm(`¿Eliminar plantilla "${p.nombre}"?`)) return;
    this.svc.eliminar(p.id).subscribe(() => this.cargar());
  }
}
