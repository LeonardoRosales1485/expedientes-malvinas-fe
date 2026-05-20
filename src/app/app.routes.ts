import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { mutatorGuard } from './core/guards/mutator.guard';
import { externoGuard } from './core/guards/externo.guard';
import { jefeOAdminGuard } from './core/guards/jefe-o-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'registro-ciudadano', loadComponent: () => import('./features/auth/registro-ciudadano.component').then(m => m.RegistroCiudadanoComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: 'bandeja', canActivate: [externoGuard], loadComponent: () => import('./features/bandeja/bandeja.component').then(m => m.BandejaComponent) },
      {
        path: 'expedientes/nuevo',
        canActivate: [mutatorGuard],
        loadComponent: () => import('./features/expediente/crear-expediente.component').then(m => m.CrearExpedienteComponent),
      },
      { path: 'expedientes/:id', loadComponent: () => import('./features/expediente/expediente-detail.component').then(m => m.ExpedienteDetailComponent) },
      { path: 'seguimiento', loadComponent: () => import('./features/seguimiento/seguimiento.component').then(m => m.SeguimientoComponent) },
      { path: 'admin/circuitos', canActivate: [adminGuard], loadComponent: () => import('./features/admin/circuitos.component').then(m => m.CircuitosComponent) },
      { path: 'admin/workflows', redirectTo: 'admin/circuitos', pathMatch: 'full' },
      { path: 'admin/reparticiones', canActivate: [adminGuard], loadComponent: () => import('./features/admin/reparticiones.component').then(m => m.ReparticionesComponent) },
      { path: 'admin/reparticiones/:id', canActivate: [adminGuard], loadComponent: () => import('./features/admin/reparticion-detail.component').then(m => m.ReparticionDetailComponent) },
      { path: 'admin/auditoria', canActivate: [adminGuard], loadComponent: () => import('./features/admin/auditoria.component').then(m => m.AuditoriaComponent) },
      { path: 'admin/usuarios', canActivate: [jefeOAdminGuard], loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent) },
      { path: 'admin/reportes', canActivate: [adminGuard], loadComponent: () => import('./features/admin/reportes.component').then(m => m.ReportesComponent) },
      { path: 'admin/archivo', canActivate: [adminGuard], loadComponent: () => import('./features/admin/archivo.component').then(m => m.ArchivoComponent) },
      { path: 'admin/plantillas', canActivate: [adminGuard], loadComponent: () => import('./features/admin/plantillas.component').then(m => m.PlantillasComponent) },
    ],
  },
  { path: '**', redirectTo: 'bandeja' },
];
