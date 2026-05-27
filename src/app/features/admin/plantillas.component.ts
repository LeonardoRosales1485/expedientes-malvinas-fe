import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlantillaActo, CampoFormulario, FormularioPredefinido, Reparticion } from '../../core/models';
import { PlantillaService, FormularioService, ReparticionService } from '../../core/services/expediente.service';
import { FORM_FIELD_TYPES, formFieldTypeLabel } from '../../core/constants/form-field-types';
import Quill from 'quill';

@Component({
  selector: 'app-plantillas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plantillas.component.html',
  styleUrl: './plantillas.component.scss',
})
export class PlantillasComponent implements OnInit, OnDestroy {
  private readonly ptSvc = inject(PlantillaService);
  private readonly fmSvc = inject(FormularioService);
  private readonly repSvc = inject(ReparticionService);

  @ViewChild('quillContainer', { static: false }) quillContainer!: ElementRef<HTMLDivElement>;

  activeTab: 'plantillas' | 'formularios' = 'plantillas';

  // ── Plantillas ──
  plantillas: PlantillaActo[] = [];
  editing: Partial<PlantillaActo> | null = null;
  saving = false;
  private quill: Quill | null = null;
  readonly TIPOS = ['Nota', 'DECRETO', 'RESOLUCIÓN', 'DISPOSICIÓN'];

  // ── Formularios ──
  formularios: FormularioPredefinido[] = [];
  editingForm: Partial<FormularioPredefinido> | null = null;
  savingForm = false;
  reparticiones: Reparticion[] = [];
  readonly formFieldTypes = FORM_FIELD_TYPES;
  readonly formFieldTypeLabel = formFieldTypeLabel;

  ngOnInit(): void {
    this.cargar();
    this.cargarFormularios();
    this.repSvc.listar().subscribe((r) => (this.reparticiones = r));
  }

  ngOnDestroy(): void {
    this.destroyQuill();
  }

  // ── Tab switching ──
  setTab(tab: 'plantillas' | 'formularios'): void {
    this.activeTab = tab;
    if (tab === 'plantillas') {
      this.cancelarFormulario();
    } else {
      this.cancelar();
    }
  }

  // ══════════════════════════════════════════════
  //  PLANTILLAS (existing)
  // ══════════════════════════════════════════════

  cargar(): void {
    this.ptSvc.listar().subscribe((p) => (this.plantillas = p));
  }

  nueva(): void {
    this.destroyQuill();
    this.editing = { nombre: '', tipoActo: 'Nota', cuerpoHtml: '', descripcion: '', variablesDisponibles: [] };
    setTimeout(() => this.initQuill(''));
  }

  editar(p: PlantillaActo): void {
    this.destroyQuill();
    this.editing = { ...p };
    setTimeout(() => this.initQuill(p.cuerpoHtml || ''));
  }

  cancelar(): void {
    this.destroyQuill();
    this.editing = null;
  }

  guardar(): void {
    if (!this.editing) return;
    this.editing.cuerpoHtml = this.quill ? this.quill.root.innerHTML : (this.editing.cuerpoHtml || '');
    this.saving = true;
    const body = this.editing as PlantillaActo;
    const op$ = body.id
      ? this.ptSvc.actualizar(body.id, body)
      : this.ptSvc.crear(body);
    op$.subscribe({
      next: () => {
        this.saving = false;
        this.editing = null;
        this.destroyQuill();
        this.cargar();
      },
      error: () => (this.saving = false),
    });
  }

  eliminar(p: PlantillaActo): void {
    if (!p.id || !confirm(`¿Eliminar plantilla "${p.nombre}"?`)) return;
    this.ptSvc.eliminar(p.id).subscribe(() => this.cargar());
  }

  insertVariable(varName: string): void {
    if (!this.quill) return;
    const sel = this.quill.getSelection();
    this.quill.insertText(sel?.index ?? this.quill.getLength(), `{{${varName}}}`, 'user');
    this.quill.setSelection((sel?.index ?? this.quill.getLength()) + varName.length + 4);
  }

  private initQuill(html: string): void {
    if (!this.quillContainer?.nativeElement) return;
    this.quill = new Quill(this.quillContainer.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          [{ align: [] }],
          ['link', 'clean'],
        ],
      },
      placeholder: 'Escribí el contenido de la plantilla…',
    });
    if (html) {
      this.quill.root.innerHTML = html;
    }
    this.quill.on('text-change', () => {
      if (this.editing) {
        this.editing.cuerpoHtml = this.quill!.root.innerHTML;
      }
    });
  }

  private destroyQuill(): void {
    if (this.quill) {
      this.quill = null;
    }
  }

  // ══════════════════════════════════════════════
  //  FORMULARIOS
  // ══════════════════════════════════════════════

  cargarFormularios(): void {
    this.fmSvc.listar().subscribe((f) => (this.formularios = f));
  }

  repNombre(id?: string): string {
    if (!id) return '';
    return this.reparticiones.find((r) => r.id === id)?.nombre ?? '';
  }

  repSigla(id?: string): string {
    if (!id) return '';
    return this.reparticiones.find((r) => r.id === id)?.sigla ?? '';
  }

  nuevaFormulario(): void {
    this.editingForm = { nombre: '', descripcion: '', campos: [], reparticionId: '' };
  }

  editarFormulario(f: FormularioPredefinido): void {
    this.editingForm = { ...f, campos: JSON.parse(JSON.stringify(f.campos || [])) };
  }

  cancelarFormulario(): void {
    this.editingForm = null;
  }

  guardarFormulario(): void {
    if (!this.editingForm) return;
    this.savingForm = true;
    const body = this.editingForm as FormularioPredefinido;
    const op$ = body.id
      ? this.fmSvc.actualizar(body.id, body)
      : this.fmSvc.crear(body);
    op$.subscribe({
      next: () => {
        this.savingForm = false;
        this.editingForm = null;
        this.cargarFormularios();
      },
      error: () => (this.savingForm = false),
    });
  }

  eliminarFormulario(f: FormularioPredefinido): void {
    if (!f.id || !confirm(`¿Eliminar formulario "${f.nombre}"?`)) return;
    this.fmSvc.eliminar(f.id).subscribe(() => this.cargarFormularios());
  }

  // ── Campo helpers ──

  private campos(): CampoFormulario[] {
    return this.editingForm?.campos ?? [];
  }

  addCampo(): void {
    if (!this.editingForm) return;
    this.editingForm.campos = [...this.campos(), { nombre: '', tipo: 'text', requerido: false, opciones: [] }];
  }

  removeCampo(i: number): void {
    if (!this.editingForm) return;
    this.editingForm.campos = this.campos().filter((_, idx) => idx !== i);
  }

  updateCampo(i: number, patch: Partial<{ nombre: string; tipo: string; requerido: boolean }>): void {
    if (!this.editingForm) return;
    const list = [...this.campos()];
    if (list[i]) Object.assign(list[i], patch);
    this.editingForm.campos = list;
  }

  opcionesText(i: number): string {
    return (this.campos()[i]?.opciones ?? []).join(', ');
  }

  setOpcionesText(i: number, text: string): void {
    if (!this.editingForm) return;
    const list = [...this.campos()];
    if (list[i]) {
      list[i].opciones = text.split(',').map((s) => s.trim()).filter(Boolean);
    }
    this.editingForm.campos = list;
  }
}
