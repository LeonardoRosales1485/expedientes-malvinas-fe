import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActuacionAdhoc, CampoFormulario, FormularioPredefinido, PlantillaActo } from '../../core/models';
import { AgregarActuacionBody, ExpedienteService, FormularioService, PlantillaService } from '../../core/services/expediente.service';
import Quill from 'quill';

interface CampoPersonalizado {
  nombre: string;
  valor: string;
}

@Component({
  selector: 'app-agregar-actuacion-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './agregar-actuacion-modal.component.html',
  styleUrl: './agregar-actuacion-modal.component.scss',
})
export class AgregarActuacionModalComponent implements OnInit, OnDestroy {
  @Input() expedienteId!: string;
  @Input() actuacionesExistentes: ActuacionAdhoc[] = [];
  @Output() guardado = new EventEmitter<ActuacionAdhoc[]>();
  @Output() cerrado = new EventEmitter<void>();

  @ViewChild('quillContainer', { static: false }) quillContainer!: ElementRef<HTMLDivElement>;

  private quill: Quill | null = null;

  tipo: 'ACTA' | 'HOJA' | null = null;

  // ACTA
  plantillas: PlantillaActo[] = [];
  plantillaSeleccionadaId = '';
  tituloActa = '';
  contenidoHtml = '';

  // HOJA
  formularios: FormularioPredefinido[] = [];
  formularioSeleccionadoId = '';
  formularioPersonalizado = false;
  valoresFormulario: Record<string, string> = {};
  camposPersonalizados: CampoPersonalizado[] = [{ nombre: '', valor: '' }];
  tituloHoja = '';

  guardando = false;
  error = '';

  constructor(
    private readonly expedienteService: ExpedienteService,
    private readonly plantillaService: PlantillaService,
    private readonly formularioService: FormularioService,
  ) {}

  ngOnInit(): void {
    this.plantillaService.listar().subscribe((p) => (this.plantillas = p));
    this.formularioService.listar().subscribe((f) => (this.formularios = f));
  }

  ngOnDestroy(): void {
    this.destroyQuill();
  }

  get formularioSeleccionado(): FormularioPredefinido | undefined {
    return this.formularios.find((f) => f.id === this.formularioSeleccionadoId);
  }

  get plantillaSeleccionada(): PlantillaActo | undefined {
    return this.plantillas.find((p) => p.id === this.plantillaSeleccionadaId);
  }

  elegirTipo(t: 'ACTA' | 'HOJA'): void {
    this.destroyQuill();
    this.tipo = t;
    this.error = '';
    if (t === 'ACTA') {
      setTimeout(() => this.initQuill(this.contenidoHtml));
    }
  }

  onPlantillaChange(): void {
    const p = this.plantillaSeleccionada;
    const html = p ? (p.cuerpoHtml || '') : '';
    if (p) {
      this.tituloActa = p.nombre;
    } else {
      this.tituloActa = '';
    }
    this.contenidoHtml = html;
    if (this.quill) {
      this.quill.root.innerHTML = html;
    }
  }

  onFormularioChange(): void {
    this.valoresFormulario = {};
    this.formularioPersonalizado = !this.formularioSeleccionadoId;
  }

  agregarCampo(): void {
    this.camposPersonalizados.push({ nombre: '', valor: '' });
  }

  eliminarCampo(i: number): void {
    this.camposPersonalizados.splice(i, 1);
  }

  puedeGuardar(): boolean {
    if (!this.tipo) return false;
    if (this.tipo === 'ACTA') return !!this.tituloActa.trim();
    if (this.tipo === 'HOJA') {
      if (!this.tituloHoja.trim()) return false;
      if (this.formularioPersonalizado) {
        return this.camposPersonalizados.some((c) => c.nombre.trim());
      }
      return true;
    }
    return false;
  }

  guardar(): void {
    if (!this.puedeGuardar() || this.guardando) return;
    this.guardando = true;
    this.error = '';

    // Sync Quill content before sending
    if (this.quill) {
      this.contenidoHtml = this.quill.root.innerHTML;
    }

    let body: AgregarActuacionBody;

    if (this.tipo === 'ACTA') {
      body = {
        tipo: 'ACTA',
        titulo: this.tituloActa.trim(),
        contenidoHtml: this.contenidoHtml,
        plantillaId: this.plantillaSeleccionadaId || undefined,
        plantillaNombre: this.plantillaSeleccionada?.nombre,
      };
    } else {
      const datos: Record<string, unknown> = {};
      let camposDef: Record<string, unknown>[] = [];

      if (this.formularioPersonalizado) {
        this.camposPersonalizados.filter((c) => c.nombre.trim()).forEach((c) => {
          datos[c.nombre.trim()] = c.valor;
          camposDef.push({ nombre: c.nombre.trim(), tipo: 'texto' });
        });
      } else {
        const form = this.formularioSeleccionado;
        if (form) {
          form.campos.forEach((c) => {
            datos[c.nombre] = this.valoresFormulario[c.nombre] ?? '';
          });
          camposDef = form.campos.map((c) => ({ nombre: c.nombre, tipo: c.tipo }));
        }
      }

      body = {
        tipo: 'HOJA',
        titulo: this.tituloHoja.trim(),
        datosFormulario: datos,
        camposDefinicion: camposDef,
        plantillaId: this.formularioSeleccionadoId || undefined,
        plantillaNombre: this.formularioSeleccionado?.nombre,
      };
    }

    this.expedienteService.agregarActuacion(this.expedienteId, body).subscribe({
      next: (exp) => {
        this.guardando = false;
        this.guardado.emit(exp.actuacionesAdhoc ?? []);
      },
      error: (e) => {
        this.guardando = false;
        this.error = e.error?.message || e.error?.detail || 'No se pudo guardar la actuación';
      },
    });
  }

  cerrar(): void {
    this.destroyQuill();
    this.cerrado.emit();
  }

  volver(): void {
    this.destroyQuill();
    this.tipo = null;
  }

  camposFormulario(form: FormularioPredefinido | undefined): CampoFormulario[] {
    return form?.campos ?? [];
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
          ['blockquote'],
          [{ align: [] }],
          ['link', 'clean'],
        ],
      },
      placeholder: 'Redactá el contenido del acta…',
    });
    if (html) {
      this.quill.root.innerHTML = html;
    }
    this.quill.on('text-change', () => {
      this.contenidoHtml = this.quill!.root.innerHTML;
    });
  }

  private destroyQuill(): void {
    this.quill = null;
  }
}
