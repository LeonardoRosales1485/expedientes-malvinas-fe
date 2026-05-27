import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlantillaActo } from '../../core/models';
import { PlantillaService } from '../../core/services/expediente.service';
import Quill from 'quill';

@Component({
  selector: 'app-plantillas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plantillas.component.html',
  styleUrl: './plantillas.component.scss',
})
export class PlantillasComponent implements OnInit, OnDestroy {
  private readonly svc = inject(PlantillaService);

  @ViewChild('quillContainer', { static: false }) quillContainer!: ElementRef<HTMLDivElement>;

  plantillas: PlantillaActo[] = [];
  editing: Partial<PlantillaActo> | null = null;
  saving = false;

  private quill: Quill | null = null;

  readonly TIPOS = ['Nota', 'DECRETO', 'RESOLUCIÓN', 'DISPOSICIÓN'];

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroyQuill();
  }

  cargar(): void {
    this.svc.listar().subscribe((p) => (this.plantillas = p));
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
      ? this.svc.actualizar(body.id, body)
      : this.svc.crear(body);
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
    this.svc.eliminar(p.id).subscribe(() => this.cargar());
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
}
