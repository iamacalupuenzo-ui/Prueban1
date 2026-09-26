import { Component, HostBinding, inject, signal } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetNotificationsService, type FleetNotificationEntry } from '../../core/fleet/fleet-notifications.service';
import { FleetTelemetryService } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService } from './fleet-map.service';

/**
 * Panel flotante de notificaciones — mismo estándar visual que el buscador
 * (`fleet-map-search.component.ts`: clase `.monitor`, mismo `:host`
 * absoluto/ancho/fondo), espejado al lado derecho del mapa (pedido
 * explícito). Primera alerta implementada: una unidad detenida retoma
 * movimiento (ver política B5 documentada en
 * `fleet-notifications.service.ts`) — la pantalla "Alertas" del sidebar
 * sigue bloqueada aparte, esto vive solo en el mapa.
 */
@Component({
  selector: 'app-fleet-notifications-panel',
  imports: [Icon],
  template: `
    <section class="monitor" [class.monitor--collapsed]="!isOpen()" aria-label="Notificaciones de unidades">
      <div class="monitor__header">
        <span class="monitor__bell">
          <cs-icon name="bell" [size]="16" aria-hidden="true" />
          @if (notifications.unreadCount()) { <span class="monitor__badge">{{ notifications.unreadCount() }}</span> }
        </span>
        <span class="monitor__title">Notificaciones</span>
        <button
          type="button"
          class="monitor__icon-button"
          [attr.aria-pressed]="notifications.voiceEnabled()"
          [attr.aria-label]="notifications.voiceEnabled() ? 'Silenciar avisos de voz' : 'Activar avisos de voz'"
          (click)="notifications.toggleVoice()"
        >
          <cs-icon name="megaphone" [size]="16" aria-hidden="true" />
        </button>
        <span class="monitor__separator" aria-hidden="true"></span>
        <button
          type="button"
          class="monitor__icon-button monitor__collapse-button"
          [class.is-collapsed]="!isOpen()"
          [attr.aria-label]="isOpen() ? 'Contraer notificaciones' : 'Expandir notificaciones'"
          (click)="isOpen() ? close() : open()"
        >
          <cs-icon name="chevron-down" [size]="16" aria-hidden="true" />
        </button>
      </div>

      @if (isOpen()) {
        <div class="monitor__results" role="list" aria-label="Lista de notificaciones">
          @for (entry of notifications.notifications(); track entry.id) {
            <div class="notification-card" role="listitem">
              <button type="button" class="notification-card__dismiss" aria-label="Descartar notificación" (click)="notifications.dismiss(entry.id)">
                <cs-icon name="x" [size]="14" aria-hidden="true" />
              </button>
              <button type="button" class="notification-card__main" (click)="focusUnit(entry)">
                <cs-icon name="bell-ring" [size]="16" class="notification-card__icon" aria-hidden="true" />
                <span class="notification-card__body">
                  <strong class="notification-card__event">{{ entry.eventLabel }}</strong>
                  <span class="notification-card__unit">{{ entry.unitName }} · {{ entry.unitCode }}</span>
                </span>
              </button>
              <div class="notification-card__footer">
                <button type="button" class="notification-card__follow" (click)="followUnit(entry)">Seguir unidad</button>
                <span class="notification-card__time">{{ relativeTime(entry.createdAt) }}</span>
              </div>
            </div>
          } @empty {
            <p class="monitor__empty" role="status">Sin notificaciones por ahora.</p>
          }
        </div>
        @if (notifications.notifications().length) {
          <button type="button" class="monitor__clear-all" (click)="notifications.clearAll()">Limpiar todo</button>
        }
      }
    </section>
  `,
  styles: [
    `
      /* El ancho (270px) se mantiene SIEMPRE, esté abierto o colapsado —
         mismo header, misma tipografía, mismo ícono de silenciar en los dos
         estados; lo único que cambia es si la lista de tarjetas está
         visible. Colapsado, el alto no se estira (bottom solo se fija
         con .is-open) para no dejar una caja vacía enorme debajo del
         header. */
      :host {
        position: absolute;
        z-index: 500;
        top: var(--layout-padding-md);
        right: var(--layout-padding-md);
        display: block;
        inline-size: 270px;
        max-inline-size: calc(100% - (var(--layout-padding-md) * 2));
        pointer-events: none;
      }
      :host.is-open {
        bottom: var(--layout-padding-md);
      }
      button {
        font: inherit;
      }
      .monitor {
        pointer-events: auto;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-md);
        background: #f8f5ed;
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        block-size: 100%;
        overflow: hidden;
      }
      /* Mismo estándar que fleet-map-search.component.ts — sin esto el
         navegador dibuja su contorno cuadrado por defecto, que se ve como
         una sobra detrás de la cápsula redondeada. */
      .monitor button:focus-visible {
        outline: var(--layout-border-thick) solid var(--color-border-focused);
        outline-offset: 2px;
      }
      .monitor__header {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: var(--layout-gap-sm);
        min-block-size: 48px;
        padding-inline: var(--layout-padding-md);
        color: var(--color-text-base-subtlest);
        border-bottom: var(--layout-border-thin) solid var(--color-border-divider);
      }
      /* Colapsado (solo el header visible, sin lista debajo) recupera la
         forma de cápsula que ya se veía bien antes — sin esto quedaba una
         caja de esquinas cuadradas, como una tarjeta a la mitad. */
      .monitor--collapsed {
        border-radius: var(--radius-full);
      }
      .monitor--collapsed .monitor__header {
        border-bottom: 0;
        /* Mismo alto (40px), mismo padding lateral (--layout-padding-lg,
           12px — no el --layout-padding-md de 8px del header abierto) y
           mismo color apagado que .collapsed-search
           (fleet-map-search.component.ts) — colapsado es una afordancia
           secundaria, con el mismo peso visual que el placeholder del
           buscador; abierto sí necesita el título con más contraste para
           jerarquía frente a la lista. */
        min-block-size: 40px;
        padding-inline: var(--layout-padding-lg);
      }
      .monitor--collapsed .monitor__title {
        color: var(--color-text-base-subtlest);
      }
      .monitor__title {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-accent);
      }
      /* El contador vive pegado a la esquina de la campana (patrón estándar
         de badge de notificación), no suelto en medio del header. */
      .monitor__bell {
        position: relative;
        display: inline-flex;
        /* El badge (abajo) sobresale del ícono con un offset negativo —
           sin este margen extra, el texto del título queda pegado al
           badge en vez de tener una separación real. */
        margin-inline-end: var(--layout-gap-xs);
      }
      .monitor__badge {
        position: absolute;
        top: -6px;
        right: -8px;
        display: grid;
        place-items: center;
        min-inline-size: 15px;
        block-size: 15px;
        padding-inline: 3px;
        border: 2px solid #f8f5ed;
        border-radius: var(--radius-full);
        background: var(--color-background-danger-default);
        color: var(--color-text-inverse);
        font-size: 9px;
        font-weight: var(--font-weight-bold);
        line-height: 1;
      }
      .monitor__icon-button {
        display: grid;
        place-items: center;
        margin-inline-start: auto;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-subtlest);
        cursor: pointer;
      }
      .monitor__icon-button:hover {
        background: var(--color-background-neutral-subtle);
        color: var(--color-text-base-default);
      }
      .monitor__icon-button[aria-pressed='false'] {
        color: var(--color-text-base-subtlest);
        opacity: 0.6;
      }
      /* Un solo glifo (chevron-down), dos sentidos: abierto apunta hacia
         arriba (contraer), colapsado apunta hacia abajo (expandir). */
      .monitor__collapse-button cs-icon {
        display: block;
        transition: transform 150ms ease;
        transform: rotate(180deg);
      }
      .monitor__collapse-button.is-collapsed cs-icon {
        transform: rotate(0deg);
      }
      .monitor__separator {
        inline-size: var(--layout-border-thin);
        block-size: 16px;
        background: var(--color-border-divider);
      }
      .monitor__results {
        display: grid;
        flex: 1 1 auto;
        min-block-size: 0;
        align-content: start;
        gap: var(--layout-gap-sm);
        overflow-y: auto;
        padding: var(--layout-padding-sm);
        scrollbar-width: none;
      }
      .monitor__results::-webkit-scrollbar {
        display: none;
      }
      .monitor__empty {
        margin: 0;
        padding: var(--layout-padding-2xl);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        text-align: center;
      }
      .monitor__clear-all {
        flex-shrink: 0;
        padding: var(--layout-padding-sm);
        border: 0;
        border-top: var(--layout-border-thin) solid var(--color-border-divider);
        background: transparent;
        color: var(--color-text-brand-default);
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-accent);
        cursor: pointer;
      }
      .monitor__clear-all:hover {
        background: var(--color-background-neutral-subtle);
      }
      .notification-card {
        position: relative;
        display: flex;
        flex-direction: column;
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
      }
      .notification-card__main {
        display: flex;
        align-items: flex-start;
        gap: var(--layout-gap-sm);
        min-inline-size: 0;
        padding: var(--layout-padding-md) var(--layout-padding-2xl) var(--layout-padding-sm) var(--layout-padding-md);
        border: 0;
        background: transparent;
        color: var(--color-text-base-default);
        text-align: left;
        cursor: pointer;
      }
      /* Sin fondo/círculo detrás — el ícono va directo al lado del texto,
         mismo peso visual que el resto de la tarjeta (pedido explícito). */
      .notification-card__icon {
        flex-shrink: 0;
        margin-block-start: 2px;
        color: var(--color-text-brand-default);
      }
      .notification-card__body {
        display: grid;
        min-inline-size: 0;
        gap: var(--layout-gap-2xs);
      }
      /* Arriba el EVENTO (título, mismo peso que .vehicle-card__title strong
         del buscador), abajo la unidad — ya no una oración completa. */
      .notification-card__event {
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-bold);
        line-height: var(--font-line-height-content-ui);
      }
      .notification-card__unit {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .notification-card__time {
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-label-small);
      }
      .notification-card__footer {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-sm);
        /* Mismo corrimiento que el ícono (16px) + su gap en .notification-card__main
           — así "Seguir unidad" queda debajo del texto (evento/unidad), no
           del ícono. */
        padding: 0 var(--layout-padding-md) var(--layout-padding-md) calc(var(--layout-padding-md) + 16px + var(--layout-gap-sm));
      }
      /* Estilo 3 (terciario): sin borde ni fondo, solo texto subrayado —
         pedido explícito, no un botón con píldora como una acción más. */
      .notification-card__follow {
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--color-text-brand-default);
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-accent);
        text-decoration: underline;
        cursor: pointer;
      }
      .notification-card__follow:hover {
        color: var(--color-text-brand-bolder);
      }
      .notification-card__dismiss {
        position: absolute;
        top: var(--layout-padding-xs);
        right: var(--layout-padding-xs);
        display: grid;
        place-items: center;
        inline-size: 24px;
        block-size: 24px;
        padding: 0;
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-subtlest);
        cursor: pointer;
      }
      .notification-card__dismiss:hover {
        background: var(--color-background-neutral-subtle);
        color: var(--color-text-base-default);
      }
      @media (max-width: 767px) {
        :host {
          top: var(--layout-padding-sm);
          right: var(--layout-padding-sm);
          inline-size: min(270px, calc(100% - (var(--layout-padding-sm) * 2)));
          max-inline-size: none;
        }
        :host.is-open {
          bottom: var(--layout-padding-sm);
        }
      }
    `,
  ],
})
export class FleetNotificationsPanelComponent {
  protected readonly notifications = inject(FleetNotificationsService);
  private readonly telemetry = inject(FleetTelemetryService);
  private readonly state = inject(FleetMapService);

  protected readonly isOpen = signal(true);

  @HostBinding('class.is-open')
  protected get isOpenHostClass(): boolean {
    return this.isOpen();
  }

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected focusUnit(entry: FleetNotificationEntry): void {
    const unit = this.telemetry.units().find((candidate) => candidate.id === entry.unitId);
    if (unit) this.state.selectUnit(unit);
  }

  /** Seguir la unidad resuelve la alerta — la notificación ya cumplió su propósito y sale de la lista (pedido explícito). */
  protected followUnit(entry: FleetNotificationEntry): void {
    const unit = this.telemetry.units().find((candidate) => candidate.id === entry.unitId);
    if (unit) this.state.openFollow(unit);
    this.notifications.dismiss(entry.id);
  }

  protected relativeTime(iso: string): string {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'Recién';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    return `Hace ${hours} h`;
  }
}
