import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

interface Feriado {
  id: string;
  fecha: string;
  descripcion: string;
}

@Component({
  selector: 'app-feriados',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  templateUrl: './feriados.component.html',
})
export class FeriadosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/feriados`;

  feriados: Feriado[] = [];
  anio = new Date().getFullYear();
  nuevaFecha = '';
  nuevaDescripcion = '';
  loading = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params = new HttpParams().set('anio', this.anio);
    this.http.get<Feriado[]>(this.base, { params }).subscribe({
      next: (f) => { this.feriados = f.sort((a, b) => a.fecha.localeCompare(b.fecha)); this.loading = false; },
      error: () => (this.loading = false),
    });
  }

  agregar(): void {
    if (!this.nuevaFecha) { this.error = 'Ingrese una fecha'; return; }
    this.error = '';
    this.http.post<Feriado>(this.base, { fecha: this.nuevaFecha, descripcion: this.nuevaDescripcion }).subscribe({
      next: (f) => {
        this.feriados = [...this.feriados, f].sort((a, b) => a.fecha.localeCompare(b.fecha));
        this.nuevaFecha = '';
        this.nuevaDescripcion = '';
      },
      error: (e) => (this.error = e.error?.message || 'Error al agregar feriado'),
    });
  }

  eliminar(f: Feriado): void {
    this.http.delete(`${this.base}/${f.id}`).subscribe(() => {
      this.feriados = this.feriados.filter((x) => x.id !== f.id);
    });
  }
}
