import { Component, Input } from '@angular/core';
import { formFieldTypeLabel, TEXT_MAX_LENGTH } from '../../core/constants/form-field-types';
import { ALL_ROLES, roleLabel } from '../../core/constants/role-labels';
import { FormFieldDef, PasoCircuito, Reparticion, Role } from '../../core/models';

@Component({
  selector: 'app-circuito-step-preview',
  standalone: true,
  templateUrl: './circuito-step-preview.component.html',
  styleUrl: './circuito-step-preview.component.scss',
})
export class CircuitoStepPreviewComponent {
  @Input({ required: true }) step!: PasoCircuito;
  @Input() reparticiones: Reparticion[] = [];

  readonly textMaxLength = TEXT_MAX_LENGTH;
  formFieldTypeLabel = formFieldTypeLabel;
  roleLabel = roleLabel;

  get formFields(): FormFieldDef[] {
    return (this.step.configuracion?.['formFields'] as FormFieldDef[]) ?? [];
  }

  get minArchivos(): number {
    const n = this.step.configuracion?.['minArchivos'];
    return typeof n === 'number' ? n : 1;
  }

  get aprobacionesNecesarias(): number {
    const n = this.step.configuracion?.['aprobacionesNecesarias'];
    return typeof n === 'number' ? n : 1;
  }

  repNombre(id: string): string {
    return this.reparticiones.find((r) => r.id === id)?.sigla ?? id;
  }

  getReparticionesAprobadoras(): string[] {
    const list = this.step.configuracion?.['reparticionesAprobadoras'] as string[] | undefined;
    if (list?.length) return list;
    return this.step.reparticionId ? [this.step.reparticionId] : [];
  }

  getRolesPermitidos(): Role[] {
    return (this.step.configuracion?.['rolesPermitidos'] as Role[]) ?? [];
  }

  tipoAccionLabel(tipo: string): string {
    const map: Record<string, string> = {
      FILE_UPLOAD: 'Carga de archivos',
      FORM: 'Formulario',
      APPROVAL: 'Aprobación',
    };
    return map[tipo] ?? tipo;
  }
}
