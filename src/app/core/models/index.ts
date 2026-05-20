export type { DemoUser } from './demo-user';
export type Role = 'ADMIN' | 'USER' | 'VIEWER' | 'EXTERNO';
export type TipoAccion = 'FILE_UPLOAD' | 'FORM' | 'APPROVAL';

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  nombre: string;
  apellido: string;
  reparticionesIds: string[];
  roles: Role[];
  esJefeDeArea?: boolean;
}

export interface Reparticion {
  id: string;
  nombre: string;
  sigla: string;
  descripcion?: string;
}

export interface ReparticionUsuarioResumen {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
}

export interface ReparticionCircuitoResumen {
  id: string;
  nombre: string;
  version: number;
  activo: boolean;
  numeroCatalogo?: number;
  pasosRelacionados: number;
}

export interface ReparticionDetalle {
  reparticion: Reparticion;
  cantidadUsuarios: number;
  usuarios: ReparticionUsuarioResumen[];
  cantidadCircuitos: number;
  circuitos: ReparticionCircuitoResumen[];
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userNombre: string;
  action: string;
  expedienteId?: string;
  expedienteNumero?: string;
  fecha: string;
}

export interface PasoCircuito {
  order: number;
  nombre: string;
  reparticionId: string;
  tipoAccion: TipoAccion;
  plazoDias: number;
  configuracion?: Record<string, unknown>;
  siguienteStep?: number | null;
}

export interface CircuitoAdministrativo {
  id: string;
  nombre: string;
  descripcion?: string;
  version: number;
  steps: PasoCircuito[];
  activo: boolean;
  numeroCatalogo?: number;
}

export interface NotificacionLog {
  tipo: string;
  mensaje: string;
  destinatarioReparticionId: string;
  fecha: string;
}

export interface Expediente {
  id: string;
  numeroExpediente: string;
  circuitoAdministrativoId: string;
  circuitoVersion: number;
  caratula: {
    fechaInicio?: string;
    iniciador?: { tipo: string; nombre: string; documento?: string; userId?: string };
    objeto: string;
    tipoTramite: string;
  };
  estadoActual: string;
  stepActual: number;
  historialSteps: HistorialStep[];
  notificacionesLog?: NotificacionLog[];
  estadoVencimiento?: string;
  fechaCierre?: string;
}

export interface Aprobacion {
  usuarioId: string;
  comentario?: string;
  fecha: string;
  nombreUsuario?: string;
}

export interface Delegacion {
  deleganteId: string;
  deleganteNombre: string;
  delegadoId: string;
  delegadoNombre: string;
  fecha: string;
  motivo?: string;
}

export interface HistorialStep {
  stepOrder: number;
  reparticionId: string;
  nombreStep: string;
  tipoAccion: TipoAccion;
  estado: string;
  fechaEntrada?: string;
  fechaSalida?: string;
  datosFormulario?: Record<string, unknown>;
  observaciones?: string;
  plazoDias: number;
  diasTranscurridos?: number;
  vencido?: boolean;
  aprobaciones?: Aprobacion[];
  archivosIds?: string[];
  usuariosResponsables?: string[];
  responsablesNombres?: Record<string, string>;
  delegaciones?: Delegacion[];
}

export interface Notification {
  id: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  expedienteId: string;
  fecha: string;
}

export interface FormFieldDef {
  nombre: string;
  tipo: string;
  requerido?: boolean;
  opciones?: string[];
}

export interface PlantillaActo {
  id?: string;
  nombre: string;
  tipoActo: string;
  cuerpoHtml: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SlotFirma {
  orden: number;
  cargoRequerido: string;
  usuarioId?: string;
  nombreUsuario?: string;
  estadoFirma: 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO';
  observaciones?: string;
  fecha?: string;
}

export interface ActoAdministrativo {
  id: string;
  expedienteId: string;
  plantillaId: string;
  tipoActo: string;
  cuerpoHtml: string;
  numeroActo?: string;
  estado: 'BORRADOR' | 'FIRMADO' | 'RECHAZADO';
  cadenaFirmas: SlotFirma[];
  createdAt: string;
  updatedAt: string;
}
