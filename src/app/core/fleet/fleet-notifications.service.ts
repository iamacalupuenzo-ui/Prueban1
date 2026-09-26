import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { FleetTelemetryService, type FleetUnit } from './fleet-telemetry.service';

const MAX_NOTIFICATIONS = 50;

export interface FleetNotificationEntry {
  readonly id: string;
  readonly unitId: string;
  readonly unitCode: string;
  readonly unitName: string;
  /** Título de la tarjeta — el EVENTO, no la unidad (pedido explícito: "arriba el evento, abajo la unidad", mismo criterio que .vehicle-card__title del buscador). */
  readonly eventLabel: string;
  /** Oración completa — solo para la voz, la tarjeta ya no la muestra como párrafo. */
  readonly message: string;
  readonly createdAt: string;
}

/**
 * Política de la alerta (B5 — cada evento declara audiencia, severidad,
 * acción y persistencia, `angular-product-builder`):
 * - Audiencia: el operador viendo el mapa (esta pestaña), sin roles
 *   diferenciados todavía — Alertas como pantalla propia sigue bloqueada en
 *   `docs/epica-a-plan-desarrollo-fleet-operations-bitacora-v1-2026-09-21.md`
 *   hasta que se acuerden severidad/responsables/acciones para TODOS los
 *   tipos de alerta; esta es la primera (movimiento), acotada al panel del
 *   mapa, no la pantalla "Alertas" del sidebar.
 * - Severidad: informativa — una unidad retomando movimiento no es una
 *   emergencia, es una actualización de estado.
 * - Acción: clic en la tarjeta centra el mapa en esa unidad (mismo patrón
 *   que "Centrar en mapa" del buscador).
 * - Persistencia: solo de sesión (in-memory, como el resto del mock — sin
 *   backend), acotada a `MAX_NOTIFICATIONS` para no crecer sin límite.
 * - Contador: es la CANTIDAD que queda en la lista, no un "no leído" que se
 *   resetea al abrir el panel (pedido explícito) — abrir/mirar el panel no
 *   cuenta como resolver la alerta, solo seguir la unidad o descartarla la
 *   saca de la lista (y por lo tanto del contador).
 *
 * Detecta la transición detenida → en movimiento comparando el
 * `stationarySince` de cada unidad contra su valor en el tick anterior (no
 * contra `isUnitStationaryOverThreshold`, que exige 60 min detenida — acá
 * alcanza con que ANTES tuviera algún `stationarySince` y AHORA no).
 */
@Injectable({ providedIn: 'root' })
export class FleetNotificationsService {
  private readonly telemetry = inject(FleetTelemetryService);
  private readonly wasStationary = new Map<string, boolean>();

  readonly notifications = signal<FleetNotificationEntry[]>([]);
  /** No es un "no leído" aparte — es la cantidad que queda en la lista. */
  readonly unreadCount = computed(() => this.notifications().length);
  readonly voiceEnabled = signal(true);

  constructor() {
    effect(() => {
      const units = this.telemetry.units();
      for (const unit of units) {
        const isStationaryNow = !!unit.stationarySince;
        const wasStationaryBefore = this.wasStationary.get(unit.id);
        if (wasStationaryBefore === true && !isStationaryNow) this.notifyMovementStarted(unit);
        this.wasStationary.set(unit.id, isStationaryNow);
      }
    });
  }

  private notifyMovementStarted(unit: FleetUnit): void {
    const message = `La unidad ${unit.name} (${unit.vehicleCode}) se ha puesto en movimiento.`;
    const entry: FleetNotificationEntry = {
      id: `${unit.id}-${Date.now()}`,
      unitId: unit.id,
      unitCode: unit.vehicleCode,
      unitName: unit.name,
      eventLabel: 'Unidad en movimiento',
      message,
      createdAt: new Date().toISOString(),
    };
    this.notifications.update((list) => [entry, ...list].slice(0, MAX_NOTIFICATIONS));
    this.speak(message);
  }

  /**
   * Web Speech API — nativa del navegador (`window.speechSynthesis`), sin
   * librería ni costo: Enzo pidió "alguna librería gratuita de voz" y esta
   * ya viene incluida en Chrome/Edge/Firefox, sin dependencia nueva que
   * evaluar ni mantener.
   */
  private speak(text: string): void {
    if (!this.voiceEnabled() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  toggleVoice(): void {
    this.voiceEnabled.update((enabled) => !enabled);
  }

  dismiss(id: string): void {
    this.notifications.update((list) => list.filter((entry) => entry.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }
}
