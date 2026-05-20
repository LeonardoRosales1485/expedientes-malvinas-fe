import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Expediente } from '../../core/models';
import { ExpedienteService } from '../../core/services/expediente.service';

const ESTADO_LABELS: Record<string, string> = {
  ARCHIVADO_PROVISORIO: 'Archivo provisorio',
  INTIMADO_1: 'Intimado (1ª)',
  INTIMADO_2: 'Intimado (2ª)',
  CADUCADO: 'Caducado',
  ARCHIVADO_DEFINITIVO: 'Archivo definitivo',
  EN_DESTRUCCION: 'En destrucción',
};

@Component({
  selector: 'app-archivo',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './archivo.component.html',
  styleUrl: './archivo.component.scss',
})
export class ArchivoComponent implements OnInit {
  private readonly expService = inject(ExpedienteService);

  expedientes: Expediente[] = [];
  filtered: Expediente[] = [];
  filtroEstado = '';

  estadoLabels = ESTADO_LABELS;
  estadoKeys = Object.keys(ESTADO_LABELS);

  ngOnInit(): void {
    this.expService.listarArchivados().subscribe((data) => {
      this.expedientes = data;
      this.aplicarFiltro();
    });
  }

  aplicarFiltro(): void {
    if (!this.filtroEstado) {
      this.filtered = this.expedientes;
    } else {
      this.filtered = this.expedientes.filter((e) => e.estadoActual === this.filtroEstado);
    }
  }

  estadoLabel(estado: string): string {
    return ESTADO_LABELS[estado] ?? estado;
  }
}
