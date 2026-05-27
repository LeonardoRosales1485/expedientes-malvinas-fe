import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TEXT_MAX_LENGTH } from '../../core/constants/form-field-types';
import { Expediente, HistorialStep, TipoAccion } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ExpedienteService, FileService, UserAdmin, UserAdminService } from '../../core/services/expediente.service';
import { PermissionService } from '../../core/services/permission.service';

interface FormFieldDef {
  nombre: string;
  tipo: string;
  requerido?: boolean;
  opciones?: string[];
}

@Component({
  selector: 'app-task-execution',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe],
  templateUrl: './task-execution.component.html',
  styleUrl: './task-execution.component.scss',
})
export class TaskExecutionComponent implements OnChanges, OnInit {
  @Input({ required: true }) step!: HistorialStep;
  @Input() configuracion: Record<string, unknown> | undefined;
  @Input() expedienteId = '';
  @Input() submitting = false;
  @Input() reparticionNombre = '';
  @Input() editMode = false;
  @Input() signMode = false;
  @Output() completed = new EventEmitter<Record<string, unknown>>();
  @Output() saved = new EventEmitter<Record<string, unknown>>();
  @Output() signed = new EventEmitter<string>();
  @Output() devolver = new EventEmitter<string>();
  @Output() edited = new EventEmitter<Record<string, unknown>>();
  @Output() delegado = new EventEmitter<Expediente>();

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly fileService = inject(FileService);
  private readonly auth = inject(AuthService);
  private readonly expService = inject(ExpedienteService);
  private readonly userAdminService = inject(UserAdminService);
  readonly perm = inject(PermissionService);

  comentario = '';
  signComment = '';
  observacionDevolver = '';
  selectedFiles: File[] = [];
  uploading = false;
  uploadError = '';

  showDelegarPanel = false;
  usuariosDelegables: UserAdmin[] = [];
  delegadoId = '';
  motivoDelegacion = '';
  delegando = false;

  form = this.fb.group({});
  formFields: FormFieldDef[] = [];
  readonly textMaxLength = TEXT_MAX_LENGTH;

  ngOnInit(): void {
    this.userAdminService.listar().subscribe({
      next: (users) => {
        const currentId = this.auth.currentUser()?.userId;
        this.usuariosDelegables = users.filter(
          (u) => u.reparticionesIds.includes(this.step.reparticionId) && u.id !== currentId
        );
      },
      error: () => (this.usuariosDelegables = []),
    });
  }

  ngOnChanges(): void {
    this.uploadError = '';
    this.selectedFiles = [];
    this.formFields = [];
    this.form = this.fb.group({});
    const raw = this.configuracion?.['formFields'];
    if (this.step?.tipoAccion === 'FORM' && Array.isArray(raw) && raw.length > 0) {
      this.formFields = raw as FormFieldDef[];
      const existing = this.editMode ? (this.step.datosFormulario ?? {}) : {};
      const group: Record<string, unknown> = {};
      this.formFields.forEach((f) => {
        const validators = f.requerido ? [Validators.required] : [];
        group[f.nombre] = [existing[f.nombre] ?? '', validators];
      });
      this.form = this.fb.group(group);
    }
  }

  get tipo(): TipoAccion {
    return this.step.tipoAccion;
  }

  get requiereFirma(): boolean {
    return (this.configuracion?.['requiereFirma'] as boolean) ?? false;
  }

  tipoAccionLabel(tipo: string): string {
    const map: Record<string, string> = {
      FILE_UPLOAD: 'Carga de archivos',
      FORM: 'Formulario',
      APPROVAL: 'Aprobación',
    };
    return map[tipo] ?? tipo;
  }

  get yaAprobo(): boolean {
    const userId = this.auth.currentUser()?.userId;
    return !!userId && (this.step.aprobaciones?.some((a) => a.usuarioId === userId) ?? false);
  }

  get minArchivos(): number {
    const n = this.configuracion?.['minArchivos'];
    return typeof n === 'number' ? n : 1;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  submitForm(): void {
    if (this.formFields.length === 0) {
      this.emitSaveOrComplete({});
      return;
    }
    if (this.form.invalid) return;
    this.emitSaveOrComplete({ formData: this.form.getRawValue() });
  }

  submitFile(): void {
    if (!this.expedienteId || this.selectedFiles.length < this.minArchivos) {
      this.uploadError = `Seleccione al menos ${this.minArchivos} archivo(s)`;
      return;
    }
    this.uploading = true;
    this.uploadError = '';
    const uploads = this.selectedFiles.map((f) =>
      this.fileService.upload(this.expedienteId, this.step.stepOrder, f)
    );
    forkJoin(uploads).subscribe({
      next: (metas) => {
        this.uploading = false;
        this.selectedFiles = [];
        if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
        this.emitSaveOrComplete({ archivosIds: metas.map((m) => m.id) });
      },
      error: () => {
        this.uploading = false;
        this.uploadError = 'Error al subir archivos';
      },
    });
  }

  private emitSaveOrComplete(payload: Record<string, unknown>): void {
    if (this.requiereFirma && !this.editMode) {
      this.saved.emit(payload);
    } else {
      this.completed.emit(payload);
    }
  }

  submitSign(): void {
    this.signed.emit(this.signComment);
  }

  submitEdit(): void {
    switch (this.tipo) {
      case 'FORM':
        if (this.form.invalid) return;
        this.edited.emit({ formData: this.form.getRawValue() });
        break;
      case 'FILE_UPLOAD':
        if (this.selectedFiles.length === 0) {
          this.uploadError = 'Seleccione al menos un archivo';
          return;
        }
        this.uploading = true;
        this.uploadError = '';
        forkJoin(this.selectedFiles.map((f) => this.fileService.upload(this.expedienteId, this.step.stepOrder, f))).subscribe({
          next: (metas) => {
            this.uploading = false;
            this.selectedFiles = [];
            if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
            this.edited.emit({ archivosIds: metas.map((m) => m.id) });
          },
          error: () => {
            this.uploading = false;
            this.uploadError = 'Error al subir archivos';
          },
        });
        break;
      case 'APPROVAL':
        this.edited.emit({ comentario: this.comentario });
        break;
    }
  }

  emitDevolver(): void {
    if (this.observacionDevolver.trim()) {
      this.devolver.emit(this.observacionDevolver);
    }
  }

  emitDelegar(): void {
    if (!this.delegadoId) return;
    this.delegando = true;
    this.expService.delegar(this.expedienteId, this.step.stepOrder, this.delegadoId, this.motivoDelegacion || undefined).subscribe({
      next: (exp) => {
        this.delegando = false;
        this.showDelegarPanel = false;
        this.delegadoId = '';
        this.motivoDelegacion = '';
        this.delegado.emit(exp);
      },
      error: () => (this.delegando = false),
    });
  }

  get primerResponsableNombre(): string {
    const [firstId] = this.step.usuariosResponsables ?? [];
    if (!firstId) return 'Usuario';
    return this.step.responsablesNombres?.[firstId] ?? firstId;
  }

  formEntries(data?: Record<string, unknown>): [string, unknown][] {
    return data ? Object.entries(data) : [];
  }
}
