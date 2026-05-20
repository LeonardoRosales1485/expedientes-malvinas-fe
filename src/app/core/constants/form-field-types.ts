export type FormFieldType = 'text' | 'textarea' | 'boolean' | 'date' | 'number' | 'select';

export const TEXT_MAX_LENGTH = 120;

export const FORM_FIELD_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'boolean',
  'date',
  'number',
  'select',
];

const LABELS: Record<FormFieldType, string> = {
  text: `Texto corto (máx. ${TEXT_MAX_LENGTH} caracteres)`,
  textarea: 'Texto largo',
  boolean: 'Tilde',
  date: 'Fecha',
  number: 'Número',
  select: 'Opciones',
};

export function formFieldTypeLabel(tipo: string): string {
  return LABELS[tipo as FormFieldType] ?? tipo;
}
