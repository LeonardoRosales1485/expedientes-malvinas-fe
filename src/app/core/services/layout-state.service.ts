import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  readonly circuitoEditorOpen = signal(false);
  readonly seguimientoLayout = signal(false);
  readonly expedienteDetailLayout = signal(false);

  setCircuitoEditorOpen(open: boolean): void {
    this.circuitoEditorOpen.set(open);
  }

  setSeguimientoLayout(open: boolean): void {
    this.seguimientoLayout.set(open);
  }

  setExpedienteDetailLayout(open: boolean): void {
    this.expedienteDetailLayout.set(open);
  }

  isMainViewportLocked(): boolean {
    return (
      this.circuitoEditorOpen() ||
      this.seguimientoLayout() ||
      this.expedienteDetailLayout()
    );
  }
}
