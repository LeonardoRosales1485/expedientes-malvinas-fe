import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TitleCasePipe } from '@angular/common';
import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutStateService } from '../../core/services/layout-state.service';
import { CircuitoStepPreviewComponent } from './circuito-step-preview.component';
import { FORM_FIELD_TYPES, formFieldTypeLabel } from '../../core/constants/form-field-types';
import { ALL_ROLES, roleLabel } from '../../core/constants/role-labels';
import { ReparticionService, CircuitoService } from '../../core/services/expediente.service';
import {
  CircuitoAdministrativo,
  FormFieldDef,
  ModalidadCircuito,
  PasoCircuito,
  Reparticion,
  Role,
  TipoAccion,
} from '../../core/models';

@Component({
  selector: 'app-circuitos',
  standalone: true,
  imports: [FormsModule, DragDropModule, CircuitoStepPreviewComponent, TitleCasePipe],
  templateUrl: './circuitos.component.html',
  styleUrl: './circuitos.component.scss',
})
export class CircuitosComponent implements OnInit, OnDestroy {
  private readonly circuitoService = inject(CircuitoService);
  private readonly reparticionService = inject(ReparticionService);
  private readonly layoutState = inject(LayoutStateService);

  circuitos: CircuitoAdministrativo[] = [];
  reparticiones: Reparticion[] = [];
  editing: CircuitoAdministrativo | null = null;
  showEditor = false;
  error = '';
  searchText = '';
  filterModalidad = '';
  modalidades: ModalidadCircuito[] = ['RESTRICTIVA', 'ORIENTATIVA', 'LIBRE'];

  // Wizard
  wizardStep: 1 | 2 | 3 = 1;

  // Drawer
  drawerOpen = false;
  editingStepIndex = -1;
  editingStep: PasoCircuito | null = null;
  drawerTab: 'basicos' | 'accion' | 'flujo' = 'basicos';

  // Modal preview
  showModal = false;

  // Autocomplete
  repSearchText = '';
  circuitoRecomendacionSearch = '';

  get filteredCircuitos(): CircuitoAdministrativo[] {
    const q = this.searchText.toLowerCase().trim();
    let result = this.circuitos;
    if (q) {
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.descripcion ?? '').toLowerCase().includes(q),
      );
    }
    if (this.filterModalidad) {
      result = result.filter((c) => c.modalidad === this.filterModalidad);
    }
    return result;
  }

  @HostBinding('class.circuitos--editing')
  get isEditingHost(): boolean {
    return this.showEditor;
  }

  ngOnDestroy(): void {
    this.layoutState.setCircuitoEditorOpen(false);
  }

  tiposAccion: TipoAccion[] = ['FILE_UPLOAD', 'FORM', 'APPROVAL'];
  formFieldTypes = FORM_FIELD_TYPES;
  formFieldTypeLabel = formFieldTypeLabel;
  allRoles = ALL_ROLES;
  roleLabel = roleLabel;

  ngOnInit(): void {
    this.load();
    this.reparticionService.listar().subscribe((r) => (this.reparticiones = r));
  }

  load(): void {
    this.circuitoService.listarTodos().subscribe((c) => (this.circuitos = c));
  }

  nuevo(): void {
    this.editing = {
      id: '',
      nombre: '',
      descripcion: '',
      version: 1,
      activo: true,
      modalidad: 'RESTRICTIVA',
      generico: false,
      steps: [this.emptyStep(0, 'RESTRICTIVA')],
    };
    this.wizardStep = 1;
    this.showEditor = true;
    this.error = '';
    this.layoutState.setCircuitoEditorOpen(true);
  }

  editar(c: CircuitoAdministrativo): void {
    this.editing = JSON.parse(JSON.stringify(c)) as CircuitoAdministrativo;
    this.wizardStep = 1;
    this.showEditor = true;
    this.error = '';
    this.layoutState.setCircuitoEditorOpen(true);
  }

  cancelar(): void {
    this.showEditor = false;
    this.editing = null;
    this.error = '';
    this.wizardStep = 1;
    this.drawerOpen = false;
    this.editingStep = null;
    this.editingStepIndex = -1;
    this.showModal = false;
    this.layoutState.setCircuitoEditorOpen(false);
  }

  get circuitosRecomendacion(): CircuitoAdministrativo[] {
    return this.circuitos.filter((c) => c.id !== this.editing?.id && c.steps.length > 0);
  }

  get circuitosRecomendacionFiltrados(): CircuitoAdministrativo[] {
    const q = this.circuitoRecomendacionSearch.toLowerCase().trim();
    if (!q) return this.circuitosRecomendacion;
    return this.circuitosRecomendacion.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.numeroCatalogo?.toString() ?? '').includes(q),
    );
  }

  get circuitoRecomendacionLabel(): string {
    const c = this.circuitosRecomendacion.find((c) => c.id === this.editing?.circuitoRecomendacionId);
    if (!c) return '';
    return c.nombre + (c.numeroCatalogo ? ` (Nº ${c.numeroCatalogo})` : '');
  }

  seleccionarCircuitoRecomendacion(id: string): void {
    if (!this.editing) return;
    this.editing.circuitoRecomendacionId = id;
    this.circuitoRecomendacionSearch = this.circuitoRecomendacionLabel;
  }

  // ── Wizard navigation ────────────────────────────────────────────

  wizardSiguiente(): void {
    if (this.wizardStep === 1) {
      if (!this.editing?.nombre?.trim()) { this.error = 'El nombre es obligatorio'; return; }
      if (!this.editing?.modalidad) { this.error = 'Seleccioná una modalidad'; return; }
      if (this.editing.modalidad === 'ORIENTATIVA' && !this.editing.circuitoRecomendacionId) {
        this.error = 'Seleccioná un circuito de referencia para las recomendaciones';
        return;
      }
      this.error = '';
      this.wizardStep = 2;
    } else if (this.wizardStep === 2) {
      this.showModal = true;
    }
  }

  wizardVolver(): void {
    if (this.wizardStep === 2) { this.wizardStep = 1; }
    else if (this.wizardStep === 3) { this.wizardStep = 2; }
  }

  // ── Step list (paso 2) ──────────────────────────────────────────

  agregarPaso(): void {
    if (!this.editing) return;
    const next = this.editing.steps.length;
    this.editing.steps.push(this.emptyStep(next, this.editing.modalidad));
  }

  eliminarPaso(i: number): void {
    if (!this.editing || this.editing.steps.length <= 1) return;
    this.editing.steps.splice(i, 1);
    this.editing.steps.forEach((s, idx) => (s.order = idx));
  }

  dropStep(event: CdkDragDrop<PasoCircuito[]>): void {
    if (!this.editing) return;
    moveItemInArray(this.editing.steps, event.previousIndex, event.currentIndex);
    this.editing.steps.forEach((s, idx) => (s.order = idx));
  }

  // ── Drawer ──────────────────────────────────────────────────────

  openDrawer(index: number): void {
    if (!this.editing) return;
    this.editingStepIndex = index;
    this.editingStep = { ...this.editing.steps[index] };
    this.editingStep.configuracion = JSON.parse(JSON.stringify(this.editing.steps[index].configuracion ?? {}));
    this.drawerTab = 'basicos';
    this.repSearchText = this.repNombre(this.editingStep.reparticionId);
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingStep = null;
    this.editingStepIndex = -1;
  }

  guardarPasoDrawer(): void {
    if (!this.editing || !this.editingStep || this.editingStepIndex < 0) return;
    this.editing.steps[this.editingStepIndex] = { ...this.editingStep };
    this.closeDrawer();
  }

  // ── Repartición autocomplete ────────────────────────────────────

  get filteredReparticiones(): Reparticion[] {
    const q = this.repSearchText.toLowerCase().trim();
    if (!q) return this.reparticiones;
    return this.reparticiones.filter(
      (r) =>
        r.sigla.toLowerCase().includes(q) ||
        r.nombre.toLowerCase().includes(q),
    );
  }

  selectReparticion(id: string, sigla: string): void {
    if (!this.editingStep) return;
    this.editingStep.reparticionId = id;
    this.repSearchText = sigla;
  }

  // ── Step config helpers ─────────────────────────────────────────

  onTipoChange(): void {
    if (!this.editingStep) return;
    if (this.editingStep.tipoAccion === 'FILE_UPLOAD') {
      this.editingStep.configuracion = { minArchivos: 1, maxArchivos: 10, extensionesPermitidas: ['.pdf', '.jpg', '.png'] };
    } else if (this.editingStep.tipoAccion === 'FORM') {
      this.editingStep.configuracion = {
        formFields: [{ nombre: 'campo1', tipo: 'text', requerido: true }],
      };
    } else if (this.editingStep.tipoAccion === 'APPROVAL') {
      this.editingStep.configuracion = {
        aprobacionesNecesarias: 1,
        reparticionesAprobadoras: this.editingStep.reparticionId ? [this.editingStep.reparticionId] : [],
        rolesPermitidos: ['USER', 'ADMIN'],
      };
    }
  }

  getFormFields(): FormFieldDef[] {
    return (this.editingStep?.configuracion?.['formFields'] as FormFieldDef[]) ?? [];
  }

  addFormField(): void {
    const fields = [...this.getFormFields()];
    fields.push({ nombre: 'nuevoCampo', tipo: 'text', requerido: false });
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), formFields: fields };
    }
  }

  updateFormField(index: number, patch: Partial<FormFieldDef>): void {
    const fields = [...this.getFormFields()];
    fields[index] = { ...fields[index], ...patch };
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), formFields: fields };
    }
  }

  removeFormField(index: number): void {
    const fields = this.getFormFields().filter((_, i) => i !== index);
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), formFields: fields };
    }
  }

  setMinArchivos(value: number): void {
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), minArchivos: value };
    }
  }

  setMaxArchivos(value: number): void {
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), maxArchivos: value };
    }
  }

  setExtensiones(value: string): void {
    if (this.editingStep) {
      const ext = value.split(',').map(s => s.trim()).filter(Boolean);
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), extensionesPermitidas: ext };
    }
  }

  getExtensiones(): string {
    const ext = this.editingStep?.configuracion?.['extensionesPermitidas'] as string[] | undefined;
    return ext?.join(', ') ?? '';
  }

  setAprobacionesNecesarias(value: number): void {
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), aprobacionesNecesarias: value };
    }
  }

  getReparticionesAprobadoras(): string[] {
    if (!this.editingStep) return [];
    const list = this.editingStep.configuracion?.['reparticionesAprobadoras'] as string[] | undefined;
    if (list?.length) return list;
    return this.editingStep.reparticionId ? [this.editingStep.reparticionId] : [];
  }

  toggleReparticionAprobadora(repId: string, checked: boolean): void {
    let list = [...this.getReparticionesAprobadoras()];
    if (checked && !list.includes(repId)) list.push(repId);
    if (!checked) list = list.filter((id) => id !== repId);
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), reparticionesAprobadoras: list };
    }
  }

  getRolesPermitidos(): Role[] {
    return (this.editingStep?.configuracion?.['rolesPermitidos'] as Role[]) ?? [];
  }

  toggleRolPermitido(role: Role, checked: boolean): void {
    let list = [...this.getRolesPermitidos()];
    if (checked && !list.includes(role)) list.push(role);
    if (!checked) list = list.filter((r) => r !== role);
    if (this.editingStep) {
      this.editingStep.configuracion = { ...(this.editingStep.configuracion ?? {}), rolesPermitidos: list };
    }
  }

  opcionesText(index: number): string {
    return this.getFormFields()[index]?.opciones?.join(', ') ?? '';
  }

  setOpcionesText(index: number, text: string): void {
    const opciones = text.split(',').map((s) => s.trim()).filter(Boolean);
    this.updateFormField(index, { opciones });
  }

  // ── Modal preview ────────────────────────────────────────────────

  closeModal(): void {
    this.showModal = false;
  }

  confirmarGuardar(): void {
    if (!this.editing) return;
    if (this.editing.steps.some((s) => !s.nombre || !s.reparticionId)) {
      this.error = 'Cada paso requiere nombre y repartición';
      return;
    }
    this.showModal = false;
    const payload = {
      nombre: this.editing.nombre,
      descripcion: this.editing.descripcion,
      activo: this.editing.activo,
      modalidad: this.editing.modalidad,
      steps: this.editing.steps,
    };

    const req = this.editing.id
      ? this.circuitoService.actualizar(this.editing.id, payload)
      : this.circuitoService.crear(payload);

    req.subscribe({
      next: () => {
        this.cancelar();
        this.load();
      },
      error: (e) => (this.error = e.error?.message || 'Error al guardar'),
    });
  }

  // ── Misc helpers ─────────────────────────────────────────────────

  eliminarCircuito(c: CircuitoAdministrativo): void {
    if (!confirm(`¿Desactivar o eliminar el circuito "${c.nombre}"?`)) return;
    this.circuitoService.eliminar(c.id).subscribe(() => this.load());
  }

  repNombre(id: string): string {
    const r = this.reparticiones.find((r) => r.id === id);
    return r ? `${r.sigla} — ${r.nombre}` : id;
  }

  repSigla(id: string): string {
    return this.reparticiones.find((r) => r.id === id)?.sigla ?? id;
  }

  tipoAccionLabel(tipo: string): string {
    const map: Record<string, string> = { FILE_UPLOAD: 'Carga de archivos', FORM: 'Formulario', APPROVAL: 'Aprobación' };
    return map[tipo] ?? tipo;
  }

  tipoAccionIcon(tipo: string): string {
    const map: Record<string, string> = { FILE_UPLOAD: '📎', FORM: '📄', APPROVAL: '✅' };
    return map[tipo] ?? '📋';
  }

  tipoAccionColor(tipo: string): string {
    const map: Record<string, string> = { FILE_UPLOAD: 'amber', FORM: 'blue', APPROVAL: 'emerald' };
    return map[tipo] ?? 'gray';
  }

  modalidadInfo(m: ModalidadCircuito): { icon: string; desc: string; color: string } {
    return {
      RESTRICTIVA: { icon: '🔒', desc: 'Flujo cerrado, pasos obligatorios', color: '#FEE2E2' },
      ORIENTATIVA: { icon: '💡', desc: 'Sugiere la ruta ideal, permite desvíos', color: '#FEF3C7' },
      LIBRE: { icon: '📂', desc: 'Gestor documental abierto, sin restricciones', color: '#D1FAE5' },
    }[m] ?? { icon: '', desc: '', color: '#fff' };
  }

  termSteps(modalidad: ModalidadCircuito): string {
    return modalidad === 'RESTRICTIVA' ? 'paso' : 'documento';
  }

  stepsLabel(modalidad: ModalidadCircuito, count: number): string {
    const t = this.termSteps(modalidad);
    return `${count} ${t}${count !== 1 ? 's' : ''}`;
  }

  stepsLabelPlural(modalidad: ModalidadCircuito): string {
    const t = this.termSteps(modalidad);
    return t.charAt(0).toUpperCase() + t.slice(1) + 's';
  }

  seleccionarModalidad(m: ModalidadCircuito): void {
    if (!this.editing) return;
    if (this.editing.generico && m !== 'LIBRE') return;
    const oldTerm = this.termSteps(this.editing.modalidad);
    this.editing.modalidad = m;
    const newTerm = this.termSteps(m);
    if (oldTerm === newTerm) return;
    const autoPattern = new RegExp(`^${oldTerm.charAt(0).toUpperCase() + oldTerm.slice(1)} \\d+$`, 'i');
    for (const step of this.editing.steps) {
      if (autoPattern.test(step.nombre)) {
        step.nombre = step.nombre.replace(
          new RegExp(oldTerm, 'i'),
          newTerm.charAt(0).toUpperCase() + newTerm.slice(1),
        );
      }
    }
    if (m !== 'ORIENTATIVA') {
      this.editing.circuitoRecomendacionId = undefined;
    }
  }

  private emptyStep(order: number, modalidad: ModalidadCircuito): PasoCircuito {
    const repId = this.reparticiones[0]?.id ?? '';
    return {
      order,
      nombre: `${this.termSteps(modalidad).charAt(0).toUpperCase() + this.termSteps(modalidad).slice(1)} ${order + 1}`,
      reparticionId: repId,
      tipoAccion: 'FORM',
      plazoDias: 5,
      configuracion: { formFields: [{ nombre: 'dato', tipo: 'text', requerido: true }] },
      siguienteStep: order + 1,
    };
  }
}
