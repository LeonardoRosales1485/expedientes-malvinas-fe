import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditoriaService } from '../../core/services/expediente.service';
import { AuditLogEntry } from '../../core/models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
})
export class AuditoriaComponent implements OnInit, OnDestroy {
  private readonly auditoriaService = inject(AuditoriaService);

  entries: AuditLogEntry[] = [];
  filtered: AuditLogEntry[] = [];
  search = '';
  loading = false;
  lastUpdated: Date | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.load();
    this.refreshInterval = setInterval(() => this.load(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  load(): void {
    this.loading = true;
    this.auditoriaService.listar().subscribe({
      next: (e) => {
        this.entries = e;
        this.lastUpdated = new Date();
        this.loading = false;
        this.applyFilter();
      },
      error: () => (this.loading = false),
    });
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.filtered = this.entries;
      return;
    }
    this.filtered = this.entries.filter(
      (e) =>
        e.userNombre.toLowerCase().includes(q) ||
        e.userEmail.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.expedienteNumero ?? '').toLowerCase().includes(q),
    );
  }
}
