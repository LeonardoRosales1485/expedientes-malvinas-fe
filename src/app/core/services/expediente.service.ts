import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ActoAdministrativo,
  AuditLogEntry,
  CircuitoAdministrativo,
  Expediente,
  Notification,
  PlantillaActo,
  Reparticion,
  ReparticionDetalle,
  Role,
} from '../models';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface FileMetadata {
  id: string;
  expedienteId: string;
  stepOrder: number;
  nombreOriginal: string;
  mimeType?: string;
  tamano: number;
  fechaSubida?: string;
}

export interface DomicilioElectronico {
  email?: string;
  whatsapp?: string;
}

export interface UserAdmin {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  reparticionesIds: string[];
  roles: Role[];
  activo: boolean;
  esJefeDeArea: boolean;
  domicilioElectronico?: DomicilioElectronico;
}

export interface UserForm {
  email: string;
  password?: string;
  nombre: string;
  apellido: string;
  reparticionesIds: string[];
  roles: Role[];
  esJefeDeArea?: boolean;
  domicilioElectronico?: DomicilioElectronico;
}

@Injectable({ providedIn: 'root' })
export class ExpedienteService {
  private base = `${environment.apiUrl}/expedientes`;

  constructor(private http: HttpClient) {}

  listar(estado?: string) {
    const q = estado ? `?estado=${estado}` : '';
    return this.http.get<Expediente[]>(`${this.base}${q}`);
  }

  listarPaginado(page: number, size = 20, estado?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) params = params.set('estado', estado);
    return this.http.get<PageResponse<Expediente>>(this.base, { params });
  }

  bandeja(filters?: { circuitoId?: string; estado?: string; vencimiento?: string }) {
    let params = new HttpParams();
    if (filters?.circuitoId) params = params.set('circuitoId', filters.circuitoId);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.vencimiento) params = params.set('vencimiento', filters.vencimiento);
    return this.http.get<Expediente[]>(`${this.base}/tareas-pendientes`, { params });
  }

  bandejaPaginado(page: number, size = 20, filters?: { circuitoId?: string; estado?: string; vencimiento?: string }) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters?.circuitoId) params = params.set('circuitoId', filters.circuitoId);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.vencimiento) params = params.set('vencimiento', filters.vencimiento);
    return this.http.get<PageResponse<Expediente>>(`${this.base}/tareas-pendientes`, { params });
  }

  buscar(q: string, estado?: string) {
    let params = new HttpParams().set('q', q);
    if (estado) params = params.set('estado', estado);
    return this.http.get<Expediente[]>(`${this.base}/buscar`, { params });
  }

  exportarPdf(id: string) {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }

  obtener(id: string) {
    return this.http.get<Expediente>(`${this.base}/${id}`);
  }

  crear(body: { circuitoAdministrativoId: string; caratula: Expediente['caratula'] }) {
    return this.http.post<Expediente>(this.base, body);
  }

  completar(id: string, stepOrder: number, body: Record<string, unknown>) {
    return this.http.post<Expediente>(`${this.base}/${id}/steps/${stepOrder}/completar`, body);
  }

  devolver(id: string, stepOrder: number, observaciones: string) {
    return this.http.post<Expediente>(`${this.base}/${id}/steps/${stepOrder}/devolver`, { observaciones });
  }

  editar(id: string, stepOrder: number, body: Record<string, unknown>) {
    return this.http.put<Expediente>(`${this.base}/${id}/steps/${stepOrder}/editar`, body);
  }

  listarArchivados() {
    return this.http.get<Expediente[]>(`${this.base}/archivo`);
  }

  delegar(id: string, stepOrder: number, delegadoId: string, motivo?: string) {
    return this.http.post<Expediente>(`${this.base}/${id}/steps/${stepOrder}/delegar`, { delegadoId, motivo });
  }
}

@Injectable({ providedIn: 'root' })
export class CircuitoService {
  private base = `${environment.apiUrl}/circuitos`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<CircuitoAdministrativo[]>(this.base);
  }

  listarTodos() {
    return this.http.get<CircuitoAdministrativo[]>(`${this.base}/all`);
  }

  obtener(id: string) {
    return this.http.get<CircuitoAdministrativo>(`${this.base}/${id}`);
  }

  crear(circuito: Partial<CircuitoAdministrativo>) {
    return this.http.post<CircuitoAdministrativo>(this.base, circuito);
  }

  actualizar(id: string, circuito: Partial<CircuitoAdministrativo>) {
    return this.http.put<CircuitoAdministrativo>(`${this.base}/${id}`, circuito);
  }

  eliminar(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReparticionService {
  private base = `${environment.apiUrl}/reparticiones`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Reparticion[]>(this.base);
  }

  obtenerDetalle(id: string) {
    return this.http.get<ReparticionDetalle>(`${this.base}/${id}/detalle`);
  }

  crear(body: Partial<Reparticion>) {
    return this.http.post<Reparticion>(this.base, body);
  }

  actualizar(id: string, body: Partial<Reparticion>) {
    return this.http.put<Reparticion>(`${this.base}/${id}`, body);
  }

  eliminar(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private base = `${environment.apiUrl}/auditoria`;

  constructor(private http: HttpClient) {}

  listar(limit = 500) {
    return this.http.get<AuditLogEntry[]>(`${this.base}?limit=${limit}`);
  }
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<UserAdmin[]>(this.base);
  }

  crear(body: UserForm) {
    return this.http.post<UserAdmin>(this.base, body);
  }

  actualizar(id: string, body: UserForm) {
    return this.http.put<UserAdmin>(`${this.base}/${id}`, body);
  }

  toggleActivo(id: string) {
    return this.http.put<UserAdmin>(`${this.base}/${id}/toggle-activo`, {});
  }

  toggleJefe(id: string) {
    return this.http.put<UserAdmin>(`${this.base}/${id}/toggle-jefe`, {});
  }

  suspenderReparticion(reparticionId: string) {
    return this.http.put<void>(`${this.base}/reparticion/${reparticionId}/suspender`, {});
  }

  reactivarReparticion(reparticionId: string) {
    return this.http.put<void>(`${this.base}/reparticion/${reparticionId}/reactivar`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class FileService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarPorExpediente(expedienteId: string) {
    return this.http.get<FileMetadata[]>(`${this.base}/expedientes/${expedienteId}/files`);
  }

  upload(expedienteId: string, stepOrder: number, file: File) {
    const form = new FormData();
    form.append('expedienteId', expedienteId);
    form.append('stepOrder', String(stepOrder));
    form.append('file', file);
    return this.http.post<FileMetadata>(`${this.base}/upload`, form);
  }

  eliminar(fileId: string) {
    return this.http.delete<void>(`${this.base}/files/${fileId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Notification[]>(this.base);
  }

  marcarLeida(id: string) {
    return this.http.put<Notification>(`${this.base}/${id}/read`, {});
  }
}

export interface DashboardData {
  total: number;
  enPlazo: number;
  proximoVencer: number;
  vencidos: number;
  cerrados: number;
  porEstado: Record<string, number>;
}

export interface RepReparticion {
  reparticionId: string;
  sigla: string;
  nombre: string;
  total: number;
  promedioDias: number;
}

export interface VencimientoRow {
  id: string;
  numero: string;
  tipoTramite: string;
  estadoVencimiento: string;
  estadoActual: string;
  createdAt: string;
}

export interface QuincenalRow {
  numero: string;
  tipoTramite: string;
  objeto: string;
  estado: string;
  estadoVencimiento: string;
  fechaInicio: string;
  pasoActual: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private base = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  dashboard() {
    return this.http.get<DashboardData>(`${this.base}/dashboard`);
  }

  porReparticion() {
    return this.http.get<RepReparticion[]>(`${this.base}/por-reparticion`);
  }

  vencimientos() {
    return this.http.get<VencimientoRow[]>(`${this.base}/vencimientos`);
  }

  quincenal() {
    return this.http.get<QuincenalRow[]>(`${this.base}/quincenal`);
  }

  exportarExcel() {
    return this.http.get(`${this.base}/quincenal/excel`, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class PlantillaService {
  private base = `${environment.apiUrl}/plantillas`;

  constructor(private http: HttpClient) {}

  listar() { return this.http.get<PlantillaActo[]>(this.base); }
  crear(body: PlantillaActo) { return this.http.post<PlantillaActo>(this.base, body); }
  actualizar(id: string, body: PlantillaActo) { return this.http.put<PlantillaActo>(`${this.base}/${id}`, body); }
  eliminar(id: string) { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ActoService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  listarPorExpediente(expedienteId: string) {
    return this.http.get<ActoAdministrativo[]>(`${this.base}/expedientes/${expedienteId}/actos`);
  }

  generar(expedienteId: string, plantillaId: string) {
    return this.http.post<ActoAdministrativo>(`${this.base}/expedientes/${expedienteId}/actos`, { plantillaId });
  }

  firmar(actoId: string) {
    return this.http.post<ActoAdministrativo>(`${this.base}/actos/${actoId}/firmar`, {});
  }

  rechazar(actoId: string, observaciones: string) {
    return this.http.post<ActoAdministrativo>(`${this.base}/actos/${actoId}/rechazar`, { observaciones });
  }
}
