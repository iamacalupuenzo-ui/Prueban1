import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { MockAuthService } from './mock-auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('redirige al login y conserva la ruta solicitada si no hay sesión', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/mapa' } as never));

    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fmapa');
  });

  it('permite acceder cuando hay una sesión activa', () => {
    TestBed.inject(MockAuthService).session.set({ email: 'operador@demo.com', role: 'Operador' });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/dashboard' } as never));

    expect(result).toBe(true);
  });
});
