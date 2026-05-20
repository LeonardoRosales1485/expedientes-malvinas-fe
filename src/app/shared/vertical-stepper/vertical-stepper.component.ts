import { Component, Input } from '@angular/core';

export type VerticalStepState = 'done' | 'current' | 'pending';

export interface VerticalStepView {
  label: string;
  hint?: string;
  state: VerticalStepState;
}

@Component({
  selector: 'app-vertical-stepper',
  standalone: true,
  templateUrl: './vertical-stepper.component.html',
  styleUrl: './vertical-stepper.component.scss',
})
export class VerticalStepperComponent {
  @Input({ required: true }) steps: VerticalStepView[] = [];
}
