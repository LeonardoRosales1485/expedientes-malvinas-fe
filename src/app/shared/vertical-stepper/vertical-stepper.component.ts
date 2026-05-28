import { Component, EventEmitter, Input, Output } from '@angular/core';

export type VerticalStepState = 'done' | 'current' | 'pending';

export interface VerticalStepView {
  label: string;
  hint?: string;
  state: VerticalStepState;
  stepOrder?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-vertical-stepper',
  standalone: true,
  templateUrl: './vertical-stepper.component.html',
  styleUrl: './vertical-stepper.component.scss',
})
export class VerticalStepperComponent {
  @Input({ required: true }) steps: VerticalStepView[] = [];
  @Output() stepClick = new EventEmitter<number>();
}
