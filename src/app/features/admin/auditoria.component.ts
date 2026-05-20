import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
export class AuditoriaComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaService);

  entries: AuditLogEntry[] = [];
  filtered: AuditLogEntry[] = [];
  search = '';

  ngOnInit(): void {
    this.auditoriaService.listar().subscribe((e) => {
      this.entries = e;
      this.applyFilter();
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
