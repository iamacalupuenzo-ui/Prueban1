import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  AppLayoutState,
  CFlotasLogo,
  Icon,
  Menu,
  MenuGroupData,
  PressScale,
} from '@iamacalupuenzo-ui/comsatel-ds';

@Component({
  imports: [CFlotasLogo, Icon, Menu, PressScale, RouterLink, RouterOutlet],
  template: `
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>
    <div
      class="operations-shell"
      [class.is-rail]="layoutState.mode() === 'rail'"
      [class.mobile-open]="mobileNavOpen()"
    >
      @if (mobileNavOpen()) {
        <button
          class="mobile-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          (click)="closeMobileNav()"
        ></button>
      }
      <aside
        id="product-navigation"
        class="product-sidenav"
        aria-label="Navegación principal"
        [attr.aria-hidden]="isMobileViewport() && !mobileNavOpen() ? 'true' : null"
        [attr.inert]="isMobileViewport() && !mobileNavOpen() ? '' : null"
      >
        <a
          class="product-brand"
          routerLink="/dashboard"
          aria-label="C-Locater Flotas, ir al tablero"
        >
          <cs-c-flotas-logo
            [variant]="navigationMode() === 'rail' ? 'isotype' : 'wordmark'"
            [size]="navigationMode() === 'rail' ? 'sm' : 'lg'"
            fit="container"
            [decorative]="true"
          />
        </a>
        <div class="product-menu">
          <cs-menu
            [groups]="navigationGroups"
            [mode]="navigationMode()"
            [activeHref]="activeHref"
            (navigate)="closeMobileNav()"
          />
        </div>
        <div class="menu-collapse">
          <button
            type="button"
            class="menu-collapse__button"
            (click)="layoutState.toggleCollapsed()"
            [attr.aria-label]="layoutState.collapsed() ? 'Expandir menú' : 'Colapsar menú'"
            [attr.aria-expanded]="!layoutState.collapsed()"
            csPressScale
          >
            <cs-icon
              [name]="layoutState.collapsed() ? 'chevrons-right' : 'chevron-left'"
              [size]="15"
            />
          </button>
        </div>
      </aside>

      <main id="main-content" class="operations-main" tabindex="-1">
        <header class="mobile-header">
          <button
            type="button"
            class="mobile-menu-trigger"
            [attr.aria-label]="mobileNavOpen() ? 'Cerrar navegación' : 'Abrir navegación'"
            [attr.aria-expanded]="mobileNavOpen()"
            aria-controls="product-navigation"
            (click)="toggleMobileNav()"
            csPressScale
          >
            <cs-icon [name]="mobileNavOpen() ? 'x' : 'menu'" [size]="18" aria-hidden="true" />
          </button>
          <a
            class="mobile-brand"
            routerLink="/dashboard"
            aria-label="C-Locater Flotas, ir al tablero"
            ><cs-c-flotas-logo variant="wordmark" size="sm" [decorative]="true"
          /></a>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        display: block;
        overflow: hidden;
      }
      .skip-link {
        position: fixed;
        z-index: var(--z-index-tooltip);
        inset: var(--layout-padding-md) auto auto var(--layout-padding-md);
        transform: translateY(-200%);
        padding: var(--layout-padding-sm) var(--layout-padding-md);
        border-radius: var(--radius-sm);
        background: var(--color-background-base);
        color: var(--color-text-link-default);
        box-shadow: var(--elevation-shadow-raised);
      }
      .skip-link:focus {
        transform: translateY(0);
      }
      .operations-shell {
        display: grid;
        grid-template-columns: var(--layout-sidenav-width-expanded) minmax(0, 1fr);
        height: 100%;
        min-height: 0;
        overflow: hidden;
        background: var(--elevation-surface-default);
        transition: grid-template-columns var(--motion-duration-medium) var(--motion-easing-default);
      }
      .operations-shell.is-rail {
        grid-template-columns: var(--layout-sidenav-width-collapsed) minmax(0, 1fr);
      }
      .product-sidenav {
        display: flex;
        flex-direction: column;
        min-height: 0;
        block-size: 100%;
        overflow: hidden;
        border-right: var(--layout-border-thin) solid var(--color-border-divider);
        background: var(--elevation-surface-default);
      }
      .product-brand {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        flex: 0 0 var(--layout-topnav-height);
        padding-inline: var(--layout-padding-xl);
        border-bottom: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-sm);
      }
      .product-brand:focus-visible {
        outline: 2px solid var(--color-border-focused);
        outline-offset: -4px;
      }
      .is-rail .product-brand {
        justify-content: center;
        padding-inline: 0;
      }
      .product-menu {
        flex: 1;
        overflow-y: auto;
        padding-block: var(--layout-padding-xl);
      }
      .menu-collapse {
        flex-shrink: 0;
        padding: var(--layout-padding-md);
        border-top: var(--layout-border-thin) solid var(--color-border-divider);
      }
      .menu-collapse__button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-block: var(--layout-padding-sm);
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-subtle);
        cursor: pointer;
      }
      .menu-collapse__button:hover {
        background: var(--color-interaction-hovered);
        color: var(--color-text-base-default);
      }
      .menu-collapse__button:focus-visible {
        outline: none;
        box-shadow:
          0 0 0 var(--layout-border-thick) var(--elevation-surface-default),
          0 0 0 var(--layout-border-thicker) var(--color-border-focused);
      }
      .operations-main {
        min-width: 0;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        background: #f8f5ed;
      }
      .mobile-header,
      .mobile-backdrop {
        display: none;
      }
      @media (max-width: 767px) {
        .operations-shell,
        .operations-shell.is-rail {
          grid-template-columns: minmax(0, 1fr);
        }
        .product-sidenav {
          position: fixed;
          z-index: var(--elevation-z-index-dropdown);
          inset: var(--layout-topnav-height) auto 0 0;
          width: var(--layout-sidenav-width-expanded);
          min-height: 0;
          block-size: calc(100dvh - var(--layout-topnav-height));
          border-right: var(--layout-border-thin) solid var(--color-border-divider);
          box-shadow: var(--elevation-shadow-raised);
          transform: translateX(-105%);
          transition: transform var(--motion-duration-medium) var(--motion-easing-default);
        }
        .mobile-open .product-sidenav {
          transform: translateX(0);
        }
        .mobile-backdrop {
          display: block;
          position: fixed;
          z-index: var(--elevation-z-index-dropdown);
          inset: var(--layout-topnav-height) 0 0;
          border: 0;
          background: rgba(0, 0, 0, 0.36);
        }
        .product-brand {
          display: none;
        }
        .menu-collapse {
          display: none;
        }
        .mobile-header {
          position: sticky;
          z-index: var(--elevation-z-index-sticky);
          top: 0;
          display: flex;
          align-items: center;
          gap: var(--layout-gap-lg);
          min-height: var(--layout-topnav-height);
          padding-inline: var(--layout-padding-xl);
          border-bottom: var(--layout-border-thin) solid var(--color-border-divider);
          background: var(--elevation-surface-default);
        }
        .mobile-menu-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: var(--layout-size-md);
          height: var(--layout-size-md);
          padding: 0;
          border: 0;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--color-icon-base-subtle);
          cursor: pointer;
        }
        .mobile-menu-trigger:hover {
          background: var(--color-interaction-hovered);
          color: var(--color-text-base-default);
        }
        .mobile-menu-trigger:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 var(--layout-border-thick) var(--elevation-surface-default),
            0 0 0 var(--layout-border-thicker) var(--color-border-focused);
        }
        .mobile-brand {
          display: inline-flex;
          align-items: center;
          color: inherit;
          line-height: 0;
        }
        .product-menu {
          padding-block: var(--layout-padding-md);
        }
      }
    `,
  ],
})
export class OperationsLayoutComponent implements OnDestroy {
  protected readonly layoutState = inject(AppLayoutState);
  protected readonly mobileNavOpen = signal(false);
  protected readonly isMobileViewport = signal(window.matchMedia('(max-width: 767px)').matches);
  protected readonly navigationMode = computed(() =>
    this.isMobileViewport() ? 'expanded' : this.layoutState.mode(),
  );
  private readonly router = inject(Router);
  private readonly mobileViewportQuery = window.matchMedia('(max-width: 767px)');
  private readonly onMobileViewportChange = (event: MediaQueryListEvent): void => {
    this.isMobileViewport.set(event.matches);
    if (!event.matches) this.closeMobileNav();
  };

  constructor() {
    this.mobileViewportQuery.addEventListener('change', this.onMobileViewportChange);
  }

  protected readonly navigationGroups: MenuGroupData[] = [
    {
      items: [
        { label: 'Tablero', href: '/dashboard', icon: 'layout-dashboard' },
        { label: 'Explorar', href: '/mapa', icon: 'map' },
        {
          label: 'Flota',
          href: '/flota',
          icon: 'truck',
          children: [
            { label: 'Vehículos', href: '/flota/vehiculos' },
            { label: 'Conductores', href: '/flota/conductores' },
            { label: 'Asignaciones', href: '/flota/asignaciones' },
          ],
        },
        { label: 'En vivo', href: '/en-vivo', icon: 'activity' },
        {
          label: 'Informes',
          href: '/informes',
          icon: 'file-text',
          children: [
            { label: 'Actividad', href: '/informes/actividad' },
            { label: 'Histórico', href: '/informes/historico' },
          ],
        },
      ],
    },
    {
      header: 'Gestión',
      items: [
        { label: 'Capturas', href: '/capturas', icon: 'table-2' },
        { label: 'Caminos', href: '/caminos', icon: 'route' },
        { label: 'Geocercas', href: '/geocercas', icon: 'hexagon' },
        { label: 'Alertas', href: '/alertas', icon: 'bell' },
      ],
    },
  ];

  protected get activeHref(): string {
    return this.router.url.split('?')[0];
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }
  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
  ngOnDestroy(): void {
    this.mobileViewportQuery.removeEventListener('change', this.onMobileViewportChange);
  }
}
