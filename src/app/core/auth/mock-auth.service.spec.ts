import { TestBed } from '@angular/core/testing';
import { MockAuthService } from './mock-auth.service';

describe('MockAuthService', () => {
  let service: MockAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockAuthService);
  });

  it('abre sesión con las credenciales de un operador', async () => {
    const result = await service.signIn('operador@demo.com', 'Flota2026!');

    expect(result.kind).toBe('success');
    expect(service.session()).toEqual({ email: 'operador@demo.com', role: 'Operador' });
  });

  it('mantiene la sesión cerrada cuando las credenciales no son válidas', async () => {
    const result = await service.signIn('operador@demo.com', 'incorrecta');

    expect(result).toEqual({ kind: 'invalid', message: 'El correo o la contraseña no son correctos.' });
    expect(service.session()).toBeNull();
  });

  it('expone el bloqueo temporal como un estado accionable', async () => {
    const result = await service.signIn('bloqueado@demo.com', 'Flota2026!');

    expect(result).toEqual({ kind: 'locked', message: 'Esta cuenta está bloqueada temporalmente. Contacta a tu administrador.' });
  });
});
