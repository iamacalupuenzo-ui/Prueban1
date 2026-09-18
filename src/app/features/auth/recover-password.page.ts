import { NgStyle } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, fieldLabelTypography, Input, textStyle } from '@iamacalupuenzo-ui/comsatel-ds';

@Component({
  imports: [Button, Input, NgStyle],
  template: `
    <main class="recovery" aria-labelledby="recovery-title">
      <cs-button variant="secondary" size="md" (click)="backToLogin()">Volver al inicio de sesión</cs-button>
      <section>
        <p class="eyebrow">Recuperación de acceso</p>
        <h1 id="recovery-title">Restablece tu contraseña</h1>
        <p>Ingresa tu correo corporativo y te enviaremos las siguientes instrucciones.</p>
        @if (sent()) {
          <p class="success" role="status">Si el correo está registrado, recibirás un enlace de recuperación.</p>
        } @else {
          <form (submit)="request($event)" novalidate>
            <div class="form-field">
              <label for="recovery-email" [ngStyle]="fieldLabelStyle">Correo corporativo</label>
              <cs-input id="recovery-email" name="email" type="email" autocomplete="email" fieldSize="lg" placeholder="nombre.apellido@empresa.com" [value]="email()" (valueChange)="email.set($event)" [invalid]="error() !== ''" aria-errormessage="recovery-error" [required]="true" />
              @if (error()) { <p id="recovery-error" class="error">{{ error() }}</p> }
            </div>
            <cs-button variant="primary" size="lg" [fullWidth]="true" (click)="request($event)">Enviar instrucciones</cs-button>
          </form>
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--color-background-base); }
    .recovery { display: grid; align-content: center; gap: var(--layout-gap-3xl); min-height: 100dvh; max-width: 480px; margin: auto; padding: var(--layout-padding-5xl); }
    section, form, .form-field { display: grid; gap: var(--layout-gap-lg); } h1, p { margin: 0; }
    h1 { font-family: var(--font-family-heading); font-size: var(--font-size-heading-medium); line-height: var(--font-line-height-heading-medium); }
    section > p { color: var(--color-text-base-subtle); } .eyebrow { color: var(--color-text-brand-default) !important; font-size: var(--font-size-content-note); font-weight: var(--font-weight-accent); text-transform: uppercase; }
    .form-field > label { color: var(--color-text-base-default); }
    cs-button { width: fit-content; } .error { color: var(--color-text-danger-default); font-size: var(--font-size-content-note); } .success { padding: var(--layout-padding-lg); color: var(--color-text-success-default); background: var(--color-background-success-subtlest); border-radius: var(--radius-md); }
    @media (max-width: 599px) { .recovery { padding: var(--layout-padding-3xl); } }
  `],
})
export class RecoverPasswordPage {
  protected readonly fieldLabelStyle = textStyle(fieldLabelTypography.lg, 'accent');
  protected readonly email = signal('');
  protected readonly error = signal('');
  protected readonly sent = signal(false);

  constructor(private readonly router: Router) {}

  protected backToLogin(): void { void this.router.navigateByUrl('/login'); }

  protected request(event: Event): void {
    event.preventDefault();
    const email = this.email().trim();
    this.error.set(!/^\S+@\S+\.\S+$/.test(email) ? 'Ingresa un correo corporativo válido.' : '');
    if (!this.error()) this.sent.set(true);
  }
}
