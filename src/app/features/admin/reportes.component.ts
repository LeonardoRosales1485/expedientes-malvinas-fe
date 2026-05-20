import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  DashboardData,
  RepReparticion,
  ReportesService,
  VencimientoRow,
} from '../../core/services/expediente.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DatePipe, DecimalPipe, KeyValuePipe],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  private readonly reportes = inject(ReportesService);

  dashboard: DashboardData | null = null;
  porReparticion: RepReparticion[] = [];
  vencimientos: VencimientoRow[] = [];
  exportando = false;

  ngOnInit(): void {
    this.reportes.dashboard().subscribe((d) => (this.dashboard = d));
    this.reportes.porReparticion().subscribe((d) => (this.porReparticion = d));
    this.reportes.vencimientos().subscribe((d) => (this.vencimientos = d));
  }

  get cumplimientoPct(): number {
    if (!this.dashboard || !this.dashboard.total) return 0;
    return Math.round((this.dashboard.enPlazo / this.dashboard.total) * 100);
  }

  exportarExcel(): void {
    this.exportando = true;
    this.reportes.exportarExcel().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte-quincenal.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando = false;
      },
      error: () => (this.exportando = false),
    });
  }
}
