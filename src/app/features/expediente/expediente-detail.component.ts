import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  ActoService,
  CircuitoService,
  ExpedienteService,
  FileMetadata,
  FileService,
  PlantillaService,
  ReparticionService,
} from '../../core/services/expediente.service';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { PermissionService } from '../../core/services/permission.service';
import { ActoAdministrativo, CircuitoAdministrativo, Expediente, HistorialStep, PlantillaActo, Reparticion } from '../../core/models';
import { TaskExecutionComponent } from './task-execution.component';
import { CircuitoProgressComponent } from '../../shared/circuito-progress/circuito-progress.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-expediente-detail',
  standalone: true,
  imports: [RouterLink, TaskExecutionComponent, DatePipe, FormsModule, EstadoLabelPipe, CircuitoProgressComponent],
  templateUrl: './expediente-detail.component.html',
  styleUrl: './expediente-detail.component.scss',
})
export class ExpedienteDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly circuitoService = inject(CircuitoService);
  private readonly fileService = inject(FileService);
  private readonly reparticionService = inject(ReparticionService);
  private readonly actoService = inject(ActoService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly http = inject(HttpClient);
  private readonly layoutState = inject(LayoutStateService);
  readonly perm = inject(PermissionService);

  expediente: Expediente | null = null;
  circuito: CircuitoAdministrativo | null = null;
  currentStep: HistorialStep | null = null;
  selectedStep: HistorialStep | null = null;
  reparticiones: Reparticion[] = [];
  stepConfig: Record<string, unknown> | undefined;
  archivos: FileMetadata[] = [];
  activeTab: 'historial' | 'documentos' | 'datos' | 'actos' | 'diagrama' = 'historial';
  actionError = '';
  completing = false;

  actos: ActoAdministrativo[] = [];
  plantillas: PlantillaActo[] = [];
  plantillaSeleccionada = '';
  generandoActo = false;

  ngOnInit(): void {
    this.layoutState.setExpedienteDetailLayout(true);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
    this.reparticionService.listar().subscribe((r) => (this.reparticiones = r));
  }

  ngOnDestroy(): void {
    this.layoutState.setExpedienteDetailLayout(false);
  }

  load(id: string): void {
    this.expedienteService.obtener(id).subscribe((exp) => {
      this.expediente = exp;
      this.currentStep =
        exp.historialSteps.find((h) => h.stepOrder === exp.stepActual && h.estado === 'pendiente') ??
        exp.historialSteps.find((h) => h.stepOrder === exp.stepActual) ??
        null;
      if (this.selectedStep) {
        this.selectedStep = exp.historialSteps.find((h) => h.stepOrder === this.selectedStep!.stepOrder) ?? null;
      }
      this.circuitoService.obtener(exp.circuitoAdministrativoId).subscribe((c) => {
        this.circuito = c;
        const def = c.steps.find((s) => s.order === exp.stepActual);
        this.stepConfig = def?.configuracion;
      });
    });
    this.fileService.listarPorExpediente(id).subscribe((f) => (this.archivos = f));
  }

  onCompleted(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.currentStep || this.completing) return;
    const body: Record<string, unknown> = {};
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['comentario']) body['comentario'] = payload['comentario'];
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.completing = true;
    this.expedienteService
      .completar(this.expediente.id, this.currentStep.stepOrder, body)
      .subscribe({
        next: (exp) => {
          this.completing = false;
          this.expediente = exp;
          this.reloadCurrentStep(exp);
          this.load(exp.id);
        },
        error: (e) => {
          this.completing = false;
          this.actionError = e.error?.detail || e.error?.message || 'No se pudo completar el paso';
        },
      });
  }

  onDevolver(obs: string): void {
    if (!this.expediente || !this.currentStep) return;
    this.expedienteService
      .devolver(this.expediente.id, this.currentStep.stepOrder, obs)
      .subscribe((exp) => {
        this.expediente = exp;
        this.reloadCurrentStep(exp);
      });
  }

  onDelegado(exp: Expediente): void {
    this.expediente = exp;
    this.reloadCurrentStep(exp);
  }

  cargarActos(): void {
    if (!this.expediente) return;
    this.actoService.listarPorExpediente(this.expediente.id).subscribe((a) => (this.actos = a));
    this.plantillaService.listar().subscribe((p) => (this.plantillas = p));
  }

  generarActo(): void {
    if (!this.expediente || !this.plantillaSeleccionada) return;
    this.generandoActo = true;
    this.actoService.generar(this.expediente.id, this.plantillaSeleccionada).subscribe({
      next: (acto) => {
        this.actos = [...this.actos, acto];
        this.plantillaSeleccionada = '';
        this.generandoActo = false;
      },
      error: () => (this.generandoActo = false),
    });
  }

  firmarActo(acto: ActoAdministrativo): void {
    this.actoService.firmar(acto.id).subscribe((updated) => {
      this.actos = this.actos.map((a) => (a.id === updated.id ? updated : a));
    });
  }

  rechazarActo(acto: ActoAdministrativo): void {
    const obs = prompt('Motivo del rechazo (opcional):') ?? '';
    this.actoService.rechazar(acto.id, obs).subscribe((updated) => {
      this.actos = this.actos.map((a) => (a.id === updated.id ? updated : a));
    });
  }

  exportarPdf(): void {
    if (!this.expediente) return;
    this.expedienteService.exportarPdf(this.expediente.id).subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob as Blob);
      a.download = `expediente-${this.expediente!.numeroExpediente}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  download(file: FileMetadata): void {
    const url = `${environment.apiUrl}/files/${file.id}`;
    this.http.get(url, { responseType: 'blob' }).subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.nombreOriginal;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  deleteFile(file: FileMetadata): void {
    if (!this.expediente) return;
    this.fileService.eliminar(file.id).subscribe(() => {
      this.archivos = this.archivos.filter((f) => f.id !== file.id);
    });
  }

  canDeleteFile(file: FileMetadata): boolean {
    const step = this.expediente?.historialSteps.find((h) => h.stepOrder === file.stepOrder);
    if (!step) return false;
    return this.canEditStep(step);
  }

  hasDatosFormulario(h: HistorialStep): boolean {
    const d = h.datosFormulario;
    return !!d && Object.keys(d).length > 0;
  }

  formEntries(data?: Record<string, unknown>): [string, unknown][] {
    return data ? Object.entries(data) : [];
  }

  canActOnStep(): boolean {
    return this.perm.canActOnStep(this.currentStep);
  }

  selectStep(h: HistorialStep): void {
    this.selectedStep = this.selectedStep?.stepOrder === h.stepOrder ? null : h;
  }

  canEditStep(step: HistorialStep): boolean {
    return this.perm.canMutateExpediente() && this.perm.canActOnReparticion(step.reparticionId);
  }

  getStepConfig(stepOrder: number): Record<string, unknown> | undefined {
    return this.circuito?.steps.find((s) => s.order === stepOrder)?.configuracion;
  }

  onEdited(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.selectedStep) return;
    const body: Record<string, unknown> = {};
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['comentario']) body['comentario'] = payload['comentario'];
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.expedienteService.editar(this.expediente.id, this.selectedStep.stepOrder, body).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.load(exp.id);
      },
      error: (e) => {
        this.actionError = e.error?.message || 'No se pudo guardar el paso';
      },
    });
  }

  tipoAccionLabel(tipo: string): string {
    const map: Record<string, string> = {
      FILE_UPLOAD: 'Carga de archivos',
      FORM: 'Formulario',
      APPROVAL: 'Aprobación',
    };
    return map[tipo] ?? tipo;
  }

  repNombre(id: string): string {
    const r = this.reparticiones.find((rep) => rep.id === id);
    return r ? `${r.sigla} — ${r.nombre}` : id;
  }

  archivosDelStep(stepOrder: number): FileMetadata[] {
    return this.archivos.filter((f) => f.stepOrder === stepOrder);
  }

  pasosCompletados(): number {
    return this.expediente?.historialSteps.filter((h) => h.estado === 'completado').length ?? 0;
  }

  get totalPasosCircuito(): number {
    return this.circuito ? this.circuito.steps.length : (this.expediente?.historialSteps.length ?? 0);
  }

  stepEstadoLabel(h: HistorialStep): string {
    if (h.estado === 'completado') return 'Completado';
    if (h.estado === 'observado') return 'Devuelto';
    if (h.stepOrder === this.expediente?.stepActual) return 'En curso';
    return 'Pendiente';
  }

  primerResponsableNombre(h: HistorialStep): string {
    const [firstId] = h.usuariosResponsables ?? [];
    if (!firstId) return 'Usuario';
    return h.responsablesNombres?.[firstId] ?? firstId;
  }

  private reloadCurrentStep(exp: Expediente): void {
    this.currentStep =
      exp.historialSteps.find((h) => h.stepOrder === exp.stepActual && h.estado === 'pendiente') ?? null;
  }
}
