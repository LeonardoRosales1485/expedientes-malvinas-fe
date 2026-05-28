import { Expediente, HistorialStep } from '../../core/models';
import { VerticalStepView } from '../../shared/vertical-stepper/vertical-stepper.component';

export function buildSeguimientoSteps(expediente: Expediente): VerticalStepView[] {
  return [...expediente.historialSteps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((h) => ({
      label: `${h.stepOrder + 1}. ${h.nombreStep}`,
      hint: stepHint(expediente, h),
      state: stepState(expediente, h),
      stepOrder: h.stepOrder,
    }));
}

export function buildSeguimientoStepsFromArray(
  steps: HistorialStep[],
  stepActual: number,
): VerticalStepView[] {
  return [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((h) => ({
      label: `${h.stepOrder + 1}. ${h.nombreStep}`,
      hint: stepHintFromState(h, stepActual),
      state: stepStateFromState(h, stepActual),
      stepOrder: h.stepOrder,
    }));
}

function stepStateFromState(step: HistorialStep, stepActual: number): VerticalStepView['state'] {
  if (step.estado === 'completado') return 'done';
  if (step.stepOrder === stepActual) return 'current';
  return 'pending';
}

function stepHintFromState(step: HistorialStep, stepActual: number): string {
  const estado =
    step.estado === 'completado'
      ? 'Completado'
      : step.stepOrder === stepActual
        ? 'En curso'
        : 'Pendiente';
  if (step.fechaSalida) return `${estado} · ${formatDate(step.fechaSalida)}`;
  if (step.fechaEntrada) return `${estado} · ${formatDate(step.fechaEntrada)}`;
  return estado;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function stepState(expediente: Expediente, step: HistorialStep): VerticalStepView['state'] {
  if (step.estado === 'completado') {
    return 'done';
  }
  if (step.stepOrder === expediente.stepActual) {
    return 'current';
  }
  return 'pending';
}

function stepHint(expediente: Expediente, step: HistorialStep): string {
  const estado =
    step.estado === 'completado'
      ? 'Completado'
      : step.stepOrder === expediente.stepActual
        ? 'En curso'
        : 'Pendiente';
  if (step.fechaSalida) {
    return `${estado} · ${formatSeguimientoDate(step.fechaSalida)}`;
  }
  if (step.fechaEntrada) {
    return `${estado} · ${formatSeguimientoDate(step.fechaEntrada)}`;
  }
  return estado;
}

function formatSeguimientoDate(value: string): string {
  try {
    return new Date(value).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function pasoActualLabel(expediente: Expediente): string | null {
  const current = expediente.historialSteps.find((h) => h.stepOrder === expediente.stepActual);
  return current?.nombreStep ?? null;
}
