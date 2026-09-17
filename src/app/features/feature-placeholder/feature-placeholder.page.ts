import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <section class="placeholder" aria-labelledby="placeholder-title">
      <p class="eyebrow">Operación</p>
      <h1 id="placeholder-title">{{ title }}</h1>
      <p>{{ description }}</p>
      <a routerLink="/dashboard">Volver al tablero</a>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .placeholder { display: grid; gap: var(--layout-gap-lg); padding: 32px; max-width: 720px; }
    h1, p { margin: 0; }
    h1 { font-size: var(--font-size-display-sm); line-height: var(--font-line-height-display-sm); }
    .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-semibold); letter-spacing: .08em; text-transform: uppercase; }
    .placeholder > p:not(.eyebrow) { color: var(--color-text-base-subtle); }
    a { color: var(--color-text-brand-default); font-weight: var(--font-weight-semibold); margin-top: var(--layout-gap-md); }
    a:focus-visible { outline: 2px solid var(--color-border-focused); outline-offset: 3px; }
    @media (max-width: 767px) { .placeholder { padding: 24px 20px; } }
  `],
})
export class FeaturePlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;
}
