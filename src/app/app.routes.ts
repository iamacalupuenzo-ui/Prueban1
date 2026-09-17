import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.page').then((page) => page.LoginPage) },
  {
    path: '',
    loadComponent: () => import('./layout/operations-layout.component').then((component) => component.OperationsLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/fleet-dashboard/fleet-dashboard.page').then((page) => page.FleetDashboardPage) },
      { path: 'mapa', loadComponent: () => import('./features/fleet-map/fleet-map.page').then((page) => page.FleetMapPage) },
      { path: 'flota/vehiculos', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Vehículos', description: 'La gestión de unidades se habilitará cuando conectemos la fuente de telemetría.' } },
      { path: 'flota/conductores', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Conductores', description: 'La gestión de conductores se habilitará en una siguiente fase de la operación.' } },
      { path: 'flota/asignaciones', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Asignaciones', description: 'Las asignaciones estarán disponibles cuando definamos sus reglas operativas.' } },
      { path: 'en-vivo', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'En vivo', description: 'Esta vista se habilitará junto con la actualización de telemetría en tiempo real.' } },
      { path: 'informes/actividad', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Actividad', description: 'El informe de actividad se habilitará cuando exista información operativa consolidada.' } },
      { path: 'informes/historico', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Histórico', description: 'El historial estará disponible cuando definamos la retención y fuente de datos.' } },
      { path: 'caminos', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Caminos', description: 'La gestión de caminos se habilitará en una siguiente fase.' } },
      { path: 'geocercas', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Geocercas', description: 'Las geocercas requieren la definición de reglas y zonas operativas.' } },
      { path: 'alertas', loadComponent: () => import('./features/feature-placeholder/feature-placeholder.page').then((page) => page.FeaturePlaceholderPage), data: { title: 'Alertas', description: 'Las alertas se habilitarán cuando acordemos severidad, responsables y acciones.' } },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
