import { Component, Input } from '@angular/core';
import { formFieldTypeLabel, TEXT_MAX_LENGTH } from '../../core/constants/form-field-types';
import { FormFieldDef } from '../../core/models';

@Component({
  selector: 'app-circuito-step-preview',
  standalone: true,
  templateUrl: './circuito-step-preview.component.html',
  styleUrl: './circuito-step-preview.component.scss',
})
export class CircuitoStepPreviewComponent {
  @Input({ required: true }) fields!: FormFieldDef[];
  @Input() requiereFirma = false;

  readonly textMaxLength = TEXT_MAX_LENGTH;
  formFieldTypeLabel = formFieldTypeLabel;
}
