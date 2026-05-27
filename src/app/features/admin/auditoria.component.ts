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
  search = '';
  loading = false;
  lastUpdated: Date | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  get filtered(): AuditLogEntry[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.entries;
    return this.entries.filter(
      (e) =>
        e.userNombre.toLowerCase().includes(q) ||
        e.userEmail.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.expedienteNumero ?? '').toLowerCase().includes(q),
    );
  }

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
      },
      error: () => (this.loading = false),
    });
  }
}
