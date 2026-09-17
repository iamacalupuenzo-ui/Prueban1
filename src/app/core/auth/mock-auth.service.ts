import { Injectable, signal } from '@angular/core';

export type MockAuthRole = 'Operador' | 'Supervisor' | 'Administrador';
export type MockAuthResult =
  | { kind: 'success'; role: MockAuthRole; email: string }
  | { kind: 'invalid' | 'locked' | 'offline' | 'expired'; message: string };

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  readonly session = signal<{ email: string; role: MockAuthRole } | null>(null);

  async signIn(email: string, password: string): Promise<MockAuthResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const normalizedEmail = email.trim().toLowerCase();
    const scenarios: Record<string, Exclude<MockAuthResult, { kind: 'success' }>> = {
      'bloqueado@demo.com': { kind: 'locked', message: 'Esta cuenta está bloqueada temporalmente. Contacta a tu administrador.' },
      'offline@demo.com': { kind: 'offline', message: 'No pudimos conectar con el servicio. Revisa tu red e inténtalo otra vez.' },
      'sesion-expirada@demo.com': { kind: 'expired', message: 'Tu sesión anterior expiró. Ingresa nuevamente para continuar.' },
    };

    if (scenarios[normalizedEmail] && password === 'Flota2026!') {
      return scenarios[normalizedEmail];
    }

    const accounts: Record<string, MockAuthRole> = {
      'operador@demo.com': 'Operador',
      'supervisor@demo.com': 'Supervisor',
      'administrador@demo.com': 'Administrador',
    };
    const role = accounts[normalizedEmail];
    if (!role || password !== 'Flota2026!') {
      return { kind: 'invalid', message: 'El correo o la contraseña no son correctos.' };
    }

    this.session.set({ email: normalizedEmail, role });
    return { kind: 'success', email: normalizedEmail, role };
  }

  signOut(): void {
    this.session.set(null);
  }
}
