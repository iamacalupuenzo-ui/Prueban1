import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <main class="support" aria-labelledby="support-title">
      <a routerLink="/login">Volver al inicio de sesión</a>
      <p class="eyebrow">Ayuda</p>
      <h1 id="support-title">Soporte de operaciones</h1>
      <p>Si no puedes acceder o ves información operativa desactualizada, contacta al administrador de tu organización. Conserva el mensaje de error y la hora en que ocurrió.</p>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; } .support { display: grid; align-content: center; gap: var(--layout-gap-lg); max-width: 640px; min-height: 100dvh; margin: auto; padding: var(--layout-padding-5xl); } h1, p { margin: 0; } h1 { font-family: var(--font-family-heading); font-size: var(--font-size-heading-medium); line-height: var(--font-line-height-heading-medium); } p:not(.eyebrow) { color: var(--color-text-base-subtle); } a { color: var(--color-text-link-default); width: fit-content; } .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-note); font-weight: var(--font-weight-accent); text-transform: uppercase; }
  `],
})
export class SupportPage {}
