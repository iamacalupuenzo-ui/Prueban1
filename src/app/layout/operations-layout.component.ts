import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AppLayoutState, CLocaterFlotasLogo, Icon, Menu, MenuGroupData, PressScale } from '@iamacalupuenzo-ui/comsatel-ds';

@Component({
  imports: [CLocaterFlotasLogo, Icon, Menu, PressScale, RouterLink, RouterOutlet],
  template: `
    <div class="operations-shell" [class.is-rail]="layoutState.mode() === 'rail'">
      <aside class="product-sidenav" aria-label="Navegación principal">
        <a class="product-brand" routerLink="/dashboard" aria-label="C-Locater Flotas, ir al tablero">
          <cs-c-locater-flotas-logo [variant]="layoutState.mode() === 'rail' ? 'icon' : 'full'" [size]="layoutState.mode() === 'rail' ? 'sm' : 'lg'" />
        </a>
        <div class="product-menu">
          <cs-menu [groups]="navigationGroups" [mode]="layoutState.mode()" [activeHref]="activeHref" />
        </div>
        <div class="menu-collapse">
          <button type="button" class="menu-collapse__button" (click)="layoutState.toggleCollapsed()" [attr.aria-label]="layoutState.collapsed() ? 'Expandir menú' : 'Colapsar menú'" [attr.aria-expanded]="!layoutState.collapsed()" csPressScale>
            <cs-icon [name]="layoutState.collapsed() ? 'chevrons-right' : 'chevron-left'" [size]="15" />
          </button>
        </div>
      </aside>

      <main class="operations-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .operations-shell { display: grid; grid-template-columns: var(--layout-sidenav-width-expanded) minmax(0, 1fr); min-height: 100dvh; background: var(--elevation-surface-default); transition: grid-template-columns var(--motion-duration-medium) var(--motion-easing-default); }
    .operations-shell.is-rail { grid-template-columns: var(--layout-sidenav-width-collapsed) minmax(0, 1fr); }
    .product-sidenav { display: flex; flex-direction: column; min-height: 100dvh; border-right: var(--layout-border-thin) solid var(--color-border-divider); background: var(--elevation-surface-default); }
    .product-brand { display: flex; align-items: center; justify-content: flex-start; flex: 0 0 var(--layout-topnav-height); padding-inline: var(--layout-padding-xl); border-bottom: var(--layout-border-thin) solid var(--color-border-divider); border-radius: var(--radius-sm); }
    .product-brand:focus-visible { outline: 2px solid var(--color-border-focused); outline-offset: -4px; }
    .is-rail .product-brand { justify-content: center; padding-inline: 0; }
    .product-menu { flex: 1; overflow-y: auto; padding-block: var(--layout-padding-xl); }
    .menu-collapse { flex-shrink: 0; padding: var(--layout-padding-md); border-top: var(--layout-border-thin) solid var(--color-border-divider); }
    .menu-collapse__button { width: 100%; display: flex; align-items: center; justify-content: center; padding-block: var(--layout-padding-sm); border: none; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-base-subtle); cursor: pointer; }
    .menu-collapse__button:hover { background: var(--color-interaction-hovered); color: var(--color-text-base-default); }
    .menu-collapse__button:focus-visible { outline: none; box-shadow: 0 0 0 var(--layout-border-thick) var(--elevation-surface-default), 0 0 0 var(--layout-border-thicker) var(--color-border-focused); }
    .operations-main { min-width: 0; }
    @media (max-width: 767px) {
      .operations-shell { grid-template-columns: minmax(0, 1fr); }
      .product-sidenav { min-height: auto; border-bottom: var(--layout-border-thin) solid var(--color-border-divider); border-right: 0; }
      .product-menu { padding-block: var(--layout-padding-md); }
    }
  `],
})
export class OperationsLayoutComponent {
  protected readonly layoutState = inject(AppLayoutState);
  private readonly router = inject(Router);

  protected readonly navigationGroups: MenuGroupData[] = [
    {
      items: [
        { label: 'Tablero', href: '/dashboard', icon: 'layout-dashboard' },
        { label: 'Explorar', href: '/mapa', icon: 'map' },
        {
          label: 'Flota', href: '/flota', icon: 'truck', children: [
            { label: 'Vehículos', href: '/flota/vehiculos' },
            { label: 'Conductores', href: '/flota/conductores' },
            { label: 'Asignaciones', href: '/flota/asignaciones' },
          ],
        },
        { label: 'En vivo', href: '/en-vivo', icon: 'activity' },
        {
          label: 'Informes', href: '/informes', icon: 'file-text', children: [
            { label: 'Actividad', href: '/informes/actividad' },
            { label: 'Histórico', href: '/informes/historico' },
          ],
        },
      ],
    },
    {
      header: 'Gestión',
      items: [
        { label: 'Caminos', href: '/caminos', icon: 'route' },
        { label: 'Geocercas', href: '/geocercas', icon: 'hexagon' },
        { label: 'Alertas', href: '/alertas', icon: 'bell' },
      ],
    },
  ];

  protected get activeHref(): string {
    return this.router.url.split('?')[0];
  }
}
