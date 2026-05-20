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
  PasoCircuito,
  Reparticion,
  Role,
  TipoAccion,
} from '../../core/models';

@Component({
  selector: 'app-circuitos',
  standalone: true,
  imports: [FormsModule, CircuitoStepPreviewComponent],
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
  expandedSteps = new Set<number>();

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
      steps: [this.emptyStep(0)],
    };
    this.openEditor();
    this.expandedSteps = new Set([0]);
  }

  editar(c: CircuitoAdministrativo): void {
    this.editing = JSON.parse(JSON.stringify(c)) as CircuitoAdministrativo;
    this.openEditor();
    this.expandedSteps = new Set(this.editing.steps.map((s) => s.order));
  }

  cancelar(): void {
    this.showEditor = false;
    this.editing = null;
    this.error = '';
    this.expandedSteps.clear();
    this.layoutState.setCircuitoEditorOpen(false);
  }

  private openEditor(): void {
    this.showEditor = true;
    this.error = '';
    this.layoutState.setCircuitoEditorOpen(true);
  }

  toggleStepExpanded(order: number): void {
    const next = new Set(this.expandedSteps);
    if (next.has(order)) next.delete(order);
    else next.add(order);
    this.expandedSteps = next;
  }

  isStepExpanded(order: number): boolean {
    return this.expandedSteps.has(order);
  }

  tipoAccionLabel(tipo: string): string {
    const map: Record<string, string> = {
      FILE_UPLOAD: 'Carga de archivos',
      FORM: 'Formulario',
      APPROVAL: 'Aprobación',
    };
    return map[tipo] ?? tipo;
  }

  agregarPaso(): void {
    if (!this.editing) return;
    const next = this.editing.steps.length;
    this.editing.steps.push(this.emptyStep(next));
    this.expandedSteps = new Set([...this.expandedSteps, next]);
  }

  eliminarPaso(i: number): void {
    if (!this.editing || this.editing.steps.length <= 1) return;
    this.editing.steps.splice(i, 1);
    this.editing.steps.forEach((s, idx) => (s.order = idx));
    this.expandedSteps.delete(i);
  }

  guardar(): void {
    if (!this.editing) return;
    if (!this.editing.nombre.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }
    if (this.editing.steps.some((s) => !s.nombre || !s.reparticionId)) {
      this.error = 'Cada paso requiere nombre y repartición';
      return;
    }

    const payload = {
      nombre: this.editing.nombre,
      descripcion: this.editing.descripcion,
      activo: this.editing.activo,
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

  eliminar(c: CircuitoAdministrativo): void {
    if (!confirm(`¿Desactivar o eliminar el circuito "${c.nombre}"?`)) return;
    this.circuitoService.eliminar(c.id).subscribe(() => this.load());
  }

  repNombre(id: string): string {
    return this.reparticiones.find((r) => r.id === id)?.sigla ?? id;
  }

  onTipoChange(step: PasoCircuito): void {
    if (step.tipoAccion === 'FILE_UPLOAD') {
      step.configuracion = { minArchivos: 1, maxArchivos: 10, extensionesPermitidas: ['.pdf', '.jpg', '.png'] };
    } else if (step.tipoAccion === 'FORM') {
      step.configuracion = {
        formFields: [{ nombre: 'campo1', tipo: 'text', requerido: true }],
      };
    } else if (step.tipoAccion === 'APPROVAL') {
      step.configuracion = {
        aprobacionesNecesarias: 1,
        reparticionesAprobadoras: step.reparticionId ? [step.reparticionId] : [],
        rolesPermitidos: ['USER', 'ADMIN'],
      };
    }
  }

  getFormFields(step: PasoCircuito): FormFieldDef[] {
    return (step.configuracion?.['formFields'] as FormFieldDef[]) ?? [];
  }

  addFormField(step: PasoCircuito): void {
    const fields = [...this.getFormFields(step)];
    fields.push({ nombre: 'nuevoCampo', tipo: 'text', requerido: false });
    step.configuracion = { ...(step.configuracion ?? {}), formFields: fields };
  }

  updateFormField(step: PasoCircuito, index: number, patch: Partial<FormFieldDef>): void {
    const fields = [...this.getFormFields(step)];
    fields[index] = { ...fields[index], ...patch };
    step.configuracion = { ...(step.configuracion ?? {}), formFields: fields };
  }

  removeFormField(step: PasoCircuito, index: number): void {
    const fields = this.getFormFields(step).filter((_, i) => i !== index);
    step.configuracion = { ...(step.configuracion ?? {}), formFields: fields };
  }

  setMinArchivos(step: PasoCircuito, value: number): void {
    step.configuracion = { ...(step.configuracion ?? {}), minArchivos: value };
  }

  setAprobacionesNecesarias(step: PasoCircuito, value: number): void {
    step.configuracion = { ...(step.configuracion ?? {}), aprobacionesNecesarias: value };
  }

  getReparticionesAprobadoras(step: PasoCircuito): string[] {
    const list = step.configuracion?.['reparticionesAprobadoras'] as string[] | undefined;
    if (list?.length) return list;
    return step.reparticionId ? [step.reparticionId] : [];
  }

  toggleReparticionAprobadora(step: PasoCircuito, repId: string, checked: boolean): void {
    let list = [...this.getReparticionesAprobadoras(step)];
    if (checked && !list.includes(repId)) list.push(repId);
    if (!checked) list = list.filter((id) => id !== repId);
    step.configuracion = { ...(step.configuracion ?? {}), reparticionesAprobadoras: list };
  }

  getRolesPermitidos(step: PasoCircuito): Role[] {
    return (step.configuracion?.['rolesPermitidos'] as Role[]) ?? [];
  }

  toggleRolPermitido(step: PasoCircuito, role: Role, checked: boolean): void {
    let list = [...this.getRolesPermitidos(step)];
    if (checked && !list.includes(role)) list.push(role);
    if (!checked) list = list.filter((r) => r !== role);
    step.configuracion = { ...(step.configuracion ?? {}), rolesPermitidos: list };
  }

  opcionesText(step: PasoCircuito, index: number): string {
    return this.getFormFields(step)[index]?.opciones?.join(', ') ?? '';
  }

  setOpcionesText(step: PasoCircuito, index: number, text: string): void {
    const opciones = text.split(',').map((s) => s.trim()).filter(Boolean);
    this.updateFormField(step, index, { opciones });
  }

  private emptyStep(order: number): PasoCircuito {
    const repId = this.reparticiones[0]?.id ?? '';
    return {
      order,
      nombre: `Paso ${order + 1}`,
      reparticionId: repId,
      tipoAccion: 'FORM',
      plazoDias: 5,
      configuracion: { formFields: [{ nombre: 'dato', tipo: 'text', requerido: true }] },
      siguienteStep: order + 1,
    };
  }
}
