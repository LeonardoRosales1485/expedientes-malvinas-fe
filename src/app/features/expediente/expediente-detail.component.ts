import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoLabelPipe } from '../../shared/pipes/estado-label.pipe';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  ActoService,
  CircuitoService,
  ExpedienteService,
  FileMetadata,
  FileService,
  ForzarPaseRequest,
  PasoEsperadoResponse,
  PlantillaService,
  ReparticionService,
} from '../../core/services/expediente.service';
import { AgregarActuacionModalComponent } from './agregar-actuacion-modal.component';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { ActoAdministrativo, ActuacionAdhoc, CircuitoAdministrativo, Expediente, FirmaExpediente, HistorialStep, PlantillaActo, Reparticion, TipoAccion } from '../../core/models';
import { TaskExecutionComponent } from './task-execution.component';
import { CircuitoProgressComponent } from '../../shared/circuito-progress/circuito-progress.component';
import { environment } from '../../../environments/environment';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-expediente-detail',
  standalone: true,
  imports: [RouterLink, TaskExecutionComponent, DatePipe, KeyValuePipe, FormsModule, EstadoLabelPipe, CircuitoProgressComponent, AgregarActuacionModalComponent, LoadingSpinnerComponent],
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
  readonly auth = inject(AuthService);
  readonly perm = inject(PermissionService);

  expediente: Expediente | null = null;
  circuito: CircuitoAdministrativo | null = null;
  currentStep: HistorialStep | null = null;
  selectedStep: HistorialStep | null = null;
  reparticiones: Reparticion[] = [];
  stepConfig: Record<string, unknown> | undefined;
  archivos: FileMetadata[] = [];
  activeTab: 'pasos' | 'documentos' | 'datos' | 'actos' | 'diagrama' | 'notificaciones' = 'pasos';
  actionError = '';
  completing = false;
  signing = false;
  revisionTab: 'original' | 'revision' = 'revision';
  reEditando = false;
  reEditMotivo = '';

  actos: ActoAdministrativo[] = [];
  plantillas: PlantillaActo[] = [];
  plantillaSeleccionada = '';
  generandoActo = false;

  actuacionModalOpen = false;

  // Firma de cierre
  firmaModalOpen = false;
  firmaComentario = '';
  firmando = false;
  marcandoCompleto = false;
  readonly today = new Date();

  // ORIENTATIVA guidance
  pasoEsperadoData: PasoEsperadoResponse | null = null;
  esCircuitoOrientativa = false;
  forzarPaseOpen = false;

  get esTerminoDocumento(): boolean {
    return this.circuito?.modalidad === 'ORIENTATIVA' || this.circuito?.modalidad === 'LIBRE';
  }
  get esLibre(): boolean {
    return this.circuito?.modalidad === 'LIBRE';
  }

  get displaySteps(): HistorialStep[] {
    if (!this.expediente || !this.circuito) return this.expediente?.historialSteps ?? [];
    return this.circuito.steps.map((s) => {
      const h = this.expediente!.historialSteps.find((hs) => hs.stepOrder === s.order);
      if (h) return h;
      return {
        stepOrder: s.order,
        reparticionId: s.reparticionId,
        nombreStep: s.nombre,
        tipoAccion: s.tipoAccion,
        estado: 'pendiente',
        plazoDias: s.plazoDias,
      } as HistorialStep;
    });
  }

  canClickStep(h: HistorialStep): boolean {
    if (this.circuito?.modalidad !== 'RESTRICTIVA') return true;
    return h.stepOrder <= (this.expediente?.stepActual ?? 0);
  }
  forzarPaseReparticion = '';
  forzarPaseComentario = '';

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
        exp.historialSteps.find((h) => h.stepOrder === exp.stepActual &&
          (h.estado === 'pendiente' || h.estado === 'guardado')) ??
        exp.historialSteps.find((h) => h.stepOrder === exp.stepActual) ??
        null;
      if (this.selectedStep) {
        this.selectedStep = exp.historialSteps.find((h) => h.stepOrder === this.selectedStep!.stepOrder) ?? null;
      }
      this.circuitoService.obtener(exp.circuitoAdministrativoId).subscribe((c) => {
        this.circuito = c;
        const def = c.steps.find((s) => s.order === exp.stepActual);
        this.stepConfig = def?.configuracion;
        this.esCircuitoOrientativa = c.modalidad === 'ORIENTATIVA';
        if (this.esCircuitoOrientativa) {
          this.cargarPasoEsperado(id);
        }
      });
    });
    this.fileService.listarPorExpediente(id).subscribe((f) => (this.archivos = f));
  }

  private cargarPasoEsperado(id: string): void {
    this.expedienteService.pasoEsperado(id).subscribe((data) => {
      this.pasoEsperadoData = data;
    });
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

  onSaved(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.currentStep || this.completing) return;
    const body: Record<string, unknown> = {};
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.completing = true;
    this.expedienteService
      .guardar(this.expediente.id, this.currentStep.stepOrder, body)
      .subscribe({
        next: (exp) => {
          this.completing = false;
          this.expediente = exp;
          this.reloadCurrentStep(exp);
          this.load(exp.id);
        },
        error: (e) => {
          this.completing = false;
          this.actionError = e.error?.detail || e.error?.message || 'No se pudo guardar el paso';
        },
      });
  }

  onSigned(comentario: string): void {
    if (!this.expediente || !this.currentStep || this.signing) return;
    this.actionError = '';
    this.signing = true;
    this.expedienteService
      .firmar(this.expediente.id, this.currentStep.stepOrder, comentario || undefined)
      .subscribe({
        next: (exp) => {
          this.signing = false;
          this.expediente = exp;
          this.reloadCurrentStep(exp);
          this.load(exp.id);
        },
        error: (e) => {
          this.signing = false;
          this.actionError = e.error?.detail || e.error?.message || 'No se pudo firmar el paso';
        },
      });
  }

  onCompletedSelected(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.selectedStep || this.completing) return;
    const body: Record<string, unknown> = {};
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['comentario']) body['comentario'] = payload['comentario'];
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.completing = true;
    this.expedienteService.completarDirecto(this.expediente.id, this.selectedStep.stepOrder, body).subscribe({
      next: (exp) => {
        this.completing = false;
        this.selectedStep = null;
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

  onSavedSelected(payload: Record<string, unknown>): void {
    // En pasos fuera de flujo (ORIENTATIVA/LIBRE), guardar equivale a completar directamente
    this.onCompletedSelected(payload);
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
    return this.currentStep?.estado === 'pendiente' && this.perm.canActOnStep(this.currentStep);
  }

  canSignStep(): boolean {
    return this.currentStep?.estado === 'guardado' && this.perm.canSignStep(this.currentStep);
  }

  selectStep(h: HistorialStep): void {
    if (!this.canClickStep(h)) return;
    if (h.stepOrder === this.expediente?.stepActual) {
      this.selectedStep = null;
      return;
    }
    this.selectedStep = this.selectedStep?.stepOrder === h.stepOrder ? null : h;
    this.reEditando = false;
    this.reEditMotivo = '';
    this.revisionTab = 'revision';
  }

  canEditStep(step: HistorialStep): boolean {
    return this.perm.canMutateExpediente() && this.perm.canActOnReparticion(step.reparticionId);
  }

  canReEditarStep(step: HistorialStep): boolean {
    return this.perm.canAccessAdmin() && step.estado === 'completado';
  }

  canAprobarRevision(step: HistorialStep): boolean {
    if (!step.pendienteAprobacionRevision) return false;
    const user = this.auth.currentUser();
    return (user?.reparticionesIds ?? []).includes(step.reparticionId);
  }

  iniciarReEdicion(): void {
    this.reEditando = true;
    this.reEditMotivo = '';
    this.revisionTab = 'revision';
  }

  cancelarReEdicion(): void {
    this.reEditando = false;
    this.reEditMotivo = '';
  }

  onReEditado(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.selectedStep) return;
    const body: Record<string, unknown> = { motivo: this.reEditMotivo };
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.expedienteService.reEditar(this.expediente.id, this.selectedStep.stepOrder, body).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.reEditando = false;
        this.reEditMotivo = '';
        this.revisionTab = 'revision';
        this.load(exp.id);
      },
      error: (e) => {
        this.actionError = e.error?.message || 'No se pudo re-editar el paso';
      },
    });
  }

  aprobarRevision(): void {
    if (!this.expediente || !this.selectedStep) return;
    this.actionError = '';
    this.expedienteService.aprobarRevision(this.expediente.id, this.selectedStep.stepOrder).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.load(exp.id);
      },
      error: (e) => {
        this.actionError = e.error?.message || 'No se pudo aprobar la revisión';
      },
    });
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

  archivosOriginalesDelStep(step: HistorialStep): FileMetadata[] {
    const ids = step.archivosIdsOriginal ?? [];
    return this.archivos.filter((f) => ids.includes(f.id));
  }

  pasosCompletados(): number {
    return this.expediente?.historialSteps.filter((h) => h.estado === 'completado').length ?? 0;
  }

  getRequiereFirma(step: HistorialStep): boolean {
    if (!this.circuito) return false;
    const def = this.circuito.steps.find((s) => s.order === step.stepOrder);
    return (def?.configuracion?.['requiereFirma'] as boolean) ?? false;
  }

  get totalPasosCircuito(): number {
    return this.circuito ? this.circuito.steps.length : (this.expediente?.historialSteps.length ?? 0);
  }

  stepEstadoLabel(h: HistorialStep): string {
    if (h.estado === 'completado') return 'Completado';
    if (h.estado === 'observado') return 'Devuelto';
    if (h.estado === 'guardado') return 'Pendiente firma';
    if (h.stepOrder === this.expediente?.stepActual) return 'En curso';
    return 'Pendiente';
  }

  primerResponsableNombre(h: HistorialStep): string {
    const [firstId] = h.usuariosResponsables ?? [];
    if (!firstId) return 'Usuario';
    return h.responsablesNombres?.[firstId] ?? firstId;
  }

  abrirForzarPase(): void {
    this.forzarPaseOpen = true;
    this.forzarPaseReparticion = '';
    this.forzarPaseComentario = '';
  }

  cerrarForzarPase(): void {
    this.forzarPaseOpen = false;
  }

  confirmarForzarPase(): void {
    if (!this.expediente || !this.forzarPaseReparticion) return;
    const body: ForzarPaseRequest = {
      reparticionDestinoId: this.forzarPaseReparticion,
      tipoAccion: 'FORM',
      comentario: this.forzarPaseComentario || undefined,
    };
    this.expedienteService.forzarPase(this.expediente.id, body).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.forzarPaseOpen = false;
        this.reloadCurrentStep(exp);
        this.load(exp.id);
      },
      error: (e) => {
        this.actionError = e.error?.detail || e.error?.message || 'No se pudo forzar el pase';
      },
    });
  }

  repSigla(id: string): string {
    const r = this.reparticiones.find((rep) => rep.id === id);
    return r?.sigla ?? id;
  }

  onActuacionGuardada(actuaciones: ActuacionAdhoc[]): void {
    if (this.expediente) {
      this.expediente = { ...this.expediente, actuacionesAdhoc: actuaciones };
    }
    this.actuacionModalOpen = false;
  }

  canMarcarCompleto(): boolean {
    if (!this.expediente || !this.circuito) return false;
    const estado = this.expediente.estadoActual;
    if (estado !== 'EN_ANALISIS_TECNICO' && estado !== 'OBSERVADO' && estado !== 'VENCIDO') return false;
    if (!this.auth.isJefeDeArea() && !this.auth.isAdmin()) return false;
    const currentStepDef = this.circuito.steps.find((s) => s.order === this.expediente!.stepActual);
    if (!currentStepDef) return false;
    const user = this.auth.currentUser();
    return (user?.reparticionesIds ?? []).includes(currentStepDef.reparticionId);
  }

  canFirmarCierre(): boolean {
    if (!this.expediente) return false;
    if (this.expediente.estadoActual !== 'PENDIENTE_FIRMA') return false;
    if (!this.auth.isJefeDeArea() && !this.auth.isAdmin()) return false;
    const user = this.auth.currentUser();
    const reps = user?.reparticionesIds ?? [];
    const tieneRep = (this.expediente.firmasRequeridas ?? []).some((f) => reps.includes(f.reparticionId));
    const yaFirmo = (this.expediente.firmasExpediente ?? []).some((f) => f.usuarioId === user?.userId);
    return tieneRep && !yaFirmo;
  }

  canJefeEditar(): boolean {
    if (!this.expediente) return false;
    return this.expediente.estadoActual === 'PENDIENTE_FIRMA'
      && (this.auth.isJefeDeArea() || this.auth.isAdmin());
  }

  firmaDeReparticion(reparticionId: string): FirmaExpediente | undefined {
    return (this.expediente?.firmasExpediente ?? []).find((f) => f.reparticionId === reparticionId);
  }

  marcarCompleto(): void {
    if (!this.expediente || this.marcandoCompleto) return;
    this.marcandoCompleto = true;
    this.actionError = '';
    this.expedienteService.marcarCompleto(this.expediente.id).subscribe({
      next: (exp) => {
        this.marcandoCompleto = false;
        this.expediente = exp;
        this.load(exp.id);
      },
      error: (e) => {
        this.marcandoCompleto = false;
        this.actionError = e.error?.detail || e.error?.message || 'No se pudo marcar como completo';
      },
    });
  }

  abrirFirmaModal(): void {
    this.firmaModalOpen = true;
    this.firmaComentario = '';
  }

  cerrarFirmaModal(): void {
    this.firmaModalOpen = false;
    this.firmaComentario = '';
  }

  confirmarFirma(): void {
    if (!this.expediente || this.firmando) return;
    this.firmando = true;
    this.actionError = '';
    this.expedienteService.firmarCierre(this.expediente.id, this.firmaComentario || undefined).subscribe({
      next: (exp) => {
        this.firmando = false;
        this.firmaModalOpen = false;
        this.expediente = exp;
        this.load(exp.id);
      },
      error: (e) => {
        this.firmando = false;
        this.actionError = e.error?.detail || e.error?.message || 'No se pudo registrar la firma';
      },
    });
  }

  onJefeEditado(payload: Record<string, unknown>): void {
    if (!this.expediente || !this.selectedStep) return;
    const body: Record<string, unknown> = {};
    const formData = payload['formData'] as Record<string, unknown> | undefined;
    if (formData && Object.keys(formData).length > 0) body['formData'] = formData;
    if (payload['archivosIds']) body['archivosIds'] = payload['archivosIds'];
    this.actionError = '';
    this.expedienteService.jefeEditar(this.expediente.id, this.selectedStep.stepOrder, body).subscribe({
      next: (exp) => {
        this.expediente = exp;
        this.reEditando = false;
        this.revisionTab = 'revision';
        this.load(exp.id);
      },
      error: (e) => {
        this.actionError = e.error?.message || 'No se pudo editar el paso';
      },
    });
  }

  private reloadCurrentStep(exp: Expediente): void {
    this.currentStep =
      exp.historialSteps.find((h) => h.stepOrder === exp.stepActual &&
        (h.estado === 'pendiente' || h.estado === 'guardado')) ??
      exp.historialSteps.find((h) => h.stepOrder === exp.stepActual) ??
      null;
  }
}
