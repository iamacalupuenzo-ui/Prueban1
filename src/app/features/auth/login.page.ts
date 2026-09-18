import { NgStyle } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button, CLocaterFlotasLogo, fieldLabelTypography, Input, PasswordInput, textStyle } from '@iamacalupuenzo-ui/comsatel-ds';
import { MockAuthService } from '../../core/auth/mock-auth.service';

@Component({
  imports: [Button, CLocaterFlotasLogo, Input, NgStyle, PasswordInput, RouterLink],
  template: `
    <main class="login-layout" aria-labelledby="login-title">
      <section class="login-pane">
        <header class="brand"><cs-c-locater-flotas-logo size="md" /></header>
        <div class="login-content">
          <div class="intro"><h1 id="login-title">Inicia sesión</h1><p>Ingresa para continuar con la operación de tu flota.</p></div>
          <form (submit)="signIn($event)" novalidate>
            @if (formMessage()) { <p class="form-message" role="alert">{{ formMessage() }}</p> }
            <div class="form-field"><label for="email" [ngStyle]="fieldLabelStyle">Correo corporativo</label><cs-input id="email" name="email" type="email" autocomplete="email" fieldSize="lg" placeholder="nombre@empresa.com" [value]="email()" (valueChange)="setEmail($event)" [invalid]="emailError() !== ''" aria-errormessage="email-error" [required]="true" />@if (emailError()) { <p id="email-error" class="field-error">{{ emailError() }}</p> }</div>
            <div class="form-field"><label for="password" [ngStyle]="fieldLabelStyle">Contraseña</label><cs-password-input id="password" name="password" autocomplete="current-password" fieldSize="lg" placeholder="Ingresa tu contraseña" [value]="password()" (valueChange)="setPassword($event)" [invalid]="passwordError() !== ''" aria-errormessage="password-error" [required]="true" />@if (passwordError()) { <p id="password-error" class="field-error">{{ passwordError() }}</p> }</div>
            <a class="recovery-link" routerLink="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
            <cs-button variant="primary" size="lg" [fullWidth]="true" [loading]="loading()" (click)="signIn($event)">Ingresar</cs-button>
          </form>
        </div>
        <footer><a routerLink="/ayuda">Soporte técnico</a><span aria-hidden="true">·</span><a routerLink="/ayuda">Centro de ayuda</a></footer>
      </section>
      <aside class="visual-pane" aria-label="Personas que hacen posible la operación de flotas"><div class="visual-copy"><p class="eyebrow">Operación conectada</p><h2>Visibilidad para cada decisión en ruta.</h2><p>Un solo lugar para acompañar a tu equipo, unidades y entregas.</p></div></aside>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .login-layout { display: grid; min-height: 100dvh; grid-template-columns: minmax(420px, 42%) 1fr; background: var(--color-background-base); }
    .login-pane { display: grid; grid-template-rows: auto 1fr auto; min-width: 0; padding: var(--layout-padding-5xl); }
    .brand { display: flex; align-items: flex-start; min-height: var(--layout-size-3xl); }
    .login-content { display: grid; align-content: center; width: min(100%, 368px); margin-inline: auto; gap: var(--layout-gap-3xl); }
    .intro { display: grid; gap: var(--layout-gap-sm); } h1, h2, p { margin: 0; }
    h1 { color: var(--color-text-base-default); font-family: var(--font-family-heading); font-size: var(--font-size-heading-medium); line-height: var(--font-line-height-heading-medium); font-weight: var(--font-weight-emphasis); letter-spacing: var(--font-letter-spacing-heading); }
    .intro p { color: var(--color-text-base-subtle); font-size: var(--font-size-content-caption); line-height: var(--font-line-height-content-caption); }
    form { display: grid; gap: var(--layout-gap-xl); } .form-field { display: grid; gap: var(--layout-gap-sm); }
    .form-field > label { color: var(--color-text-base-default); }
    .field-error, .form-message { color: var(--color-text-danger-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .form-message { padding: var(--layout-padding-lg); border-radius: var(--radius-md); background: var(--color-background-danger-subtlest); }
    .recovery-link, footer a { color: var(--color-text-link-default); font-family: var(--font-family-content); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); font-weight: var(--font-weight-accent); text-decoration: underline; text-underline-offset: 2px; width: fit-content; }
    .recovery-link { margin-top: var(--layout-gap-xs); } footer { display: flex; gap: var(--layout-gap-md); align-items: center; color: var(--color-text-base-subtle); }
    footer a { font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); font-weight: var(--font-weight-regular); }
    .visual-pane { position: relative; display: grid; align-items: end; min-width: 0; padding: var(--layout-padding-5xl); overflow: hidden; color: var(--color-text-inverse); background: linear-gradient(180deg, transparent 30%, rgba(15, 33, 61, .9) 100%), url('/fleet-login-operations.png') center / cover no-repeat; }
    .visual-copy { display: grid; gap: var(--layout-gap-sm); max-width: 400px; } .eyebrow { font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); font-weight: var(--font-weight-accent); letter-spacing: var(--font-letter-spacing-content); text-transform: uppercase; }
    h2 { font-family: var(--font-family-heading); font-size: var(--font-size-heading-small); line-height: var(--font-line-height-heading-small); font-weight: var(--font-weight-emphasis); } .visual-copy > p:last-child { font-size: var(--font-size-content-caption); line-height: var(--font-line-height-content-caption); }
    @media (max-width: 959px) { .login-layout { grid-template-columns: 1fr; } .visual-pane { display: none; } .login-pane { min-height: 100dvh; } }
    @media (max-width: 599px) { .login-pane { padding: var(--layout-padding-3xl); } .login-content { width: 100%; } .brand { min-height: var(--layout-size-2xl); } }
  `],
})
export class LoginPage {
  protected readonly fieldLabelStyle = textStyle(fieldLabelTypography.lg, 'accent');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly emailError = signal('');
  protected readonly passwordError = signal('');
  protected readonly formMessage = signal('');
  protected readonly loading = signal(false);

  constructor(private readonly router: Router, private readonly route: ActivatedRoute, private readonly auth: MockAuthService) {}

  protected setEmail(value: string): void { this.email.set(value); this.emailError.set(''); this.formMessage.set(''); }
  protected setPassword(value: string): void { this.password.set(value); this.passwordError.set(''); this.formMessage.set(''); }

  protected async signIn(event: Event): Promise<void> {
    event.preventDefault();
    this.emailError.set(''); this.passwordError.set(''); this.formMessage.set('');
    const email = this.email().trim();
    if (!email) { this.emailError.set('Ingresa tu correo corporativo.'); }
    else if (!/^\S+@\S+\.\S+$/.test(email)) { this.emailError.set('Ingresa un correo válido.'); }
    if (!this.password()) { this.passwordError.set('Ingresa tu contraseña.'); }
    if (this.emailError() || this.passwordError()) return;

    this.loading.set(true);
    const result = await this.auth.signIn(email, this.password());
    this.loading.set(false);
    if (result.kind === 'success') {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/dashboard');
      return;
    }
    this.formMessage.set(result.message);
  }
}
