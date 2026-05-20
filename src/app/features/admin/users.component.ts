import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ALL_ROLES, roleLabel } from '../../core/constants/role-labels';
import { AuthService } from '../../core/services/auth.service';
import { ReparticionService, UserAdmin, UserAdminService, UserForm } from '../../core/services/expediente.service';
import { Reparticion, Role } from '../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserAdminService);
  private readonly reparticionService = inject(ReparticionService);
  private readonly auth = inject(AuthService);

  users: UserAdmin[] = [];
  reparticiones: Reparticion[] = [];
  editing: UserForm & { id?: string; esJefeDeArea?: boolean } | null = null;
  error = '';
  allRoles = ALL_ROLES;
  roleLabel = roleLabel;
  searchText = '';

  get filteredUsers(): UserAdmin[] {
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.users;
    return this.users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.nombre.toLowerCase().includes(q) ||
        (u.apellido ?? '').toLowerCase().includes(q) ||
        this.repNombres(u.reparticionesIds).toLowerCase().includes(q),
    );
  }

  ngOnInit(): void {
    this.load();
    this.reparticionService.listar().subscribe((r) => (this.reparticiones = r));
  }

  load(): void {
    this.userService.listar().subscribe((u) => (this.users = u));
  }

  nuevo(): void {
    this.editing = {
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      reparticionesIds: [],
      roles: ['USER'],
    };
    this.error = '';
  }

  editar(u: UserAdmin): void {
    this.editing = {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      reparticionesIds: [...u.reparticionesIds],
      roles: [...u.roles],
      esJefeDeArea: u.esJefeDeArea,
    };
    this.error = '';
  }

  toggleActivo(u: UserAdmin): void {
    this.userService.toggleActivo(u.id).subscribe((updated) => {
      u.activo = updated.activo;
    });
  }

  toggleJefe(u: UserAdmin): void {
    this.userService.toggleJefe(u.id).subscribe((updated) => {
      u.esJefeDeArea = updated.esJefeDeArea;
    });
  }

  cancelar(): void {
    this.editing = null;
  }

  toggleRep(id: string, checked: boolean): void {
    if (!this.editing) return;
    if (checked) {
      if (!this.editing.reparticionesIds.includes(id)) {
        this.editing.reparticionesIds.push(id);
      }
    } else {
      this.editing.reparticionesIds = this.editing.reparticionesIds.filter((x) => x !== id);
    }
  }

  toggleRole(role: Role, checked: boolean): void {
    if (!this.editing) return;
    if (checked) {
      if (!this.editing.roles.includes(role)) this.editing.roles.push(role);
    } else {
      this.editing.roles = this.editing.roles.filter((r) => r !== role);
    }
  }

  guardar(): void {
    if (!this.editing?.email || !this.editing.nombre) {
      this.error = 'Email y nombre son obligatorios';
      return;
    }
    if (!this.editing.id && !this.editing.password) {
      this.error = 'La contraseña es obligatoria para usuarios nuevos';
      return;
    }
    const body: UserForm = {
      email: this.editing.email,
      password: this.editing.password,
      nombre: this.editing.nombre,
      apellido: this.editing.apellido,
      reparticionesIds: this.editing.reparticionesIds,
      roles: this.editing.roles,
      esJefeDeArea: this.editing.esJefeDeArea,
    };
    const req = this.editing.id
      ? this.userService.actualizar(this.editing.id, body)
      : this.userService.crear(body);
    const editedId = this.editing.id;
    req.subscribe({
      next: () => {
        if (editedId && editedId === this.auth.currentUser()?.userId) {
          this.auth.refreshSession().subscribe();
        }
        this.cancelar();
        this.load();
      },
      error: (e) => (this.error = e.error?.message || 'Error al guardar'),
    });
  }

  repNombres(ids: string[]): string {
    return ids
      .map((id) => this.reparticiones.find((r) => r.id === id)?.sigla ?? id)
      .join(', ');
  }

  rolesText(roles: Role[]): string {
    return roles.map((r) => roleLabel(r)).join(', ');
  }
}
