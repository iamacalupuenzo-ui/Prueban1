import { Injectable, signal } from '@angular/core';

export type MockAuthRole = 'Operador' | 'Supervisor' | 'Administrador';
export type MockAuthResult =
  | { kind: 'success'; role: MockAuthRole; email: string }
  | { kind: 'invalid' | 'locked' | 'offline' | 'expired'; message: string };

type MockAuthSession = { email: string; role: MockAuthRole };

const SESSION_STORAGE_KEY = 'clocater-flotas.mock-auth-session';
const AUTH_ROLES: readonly MockAuthRole[] = ['Operador', 'Supervisor', 'Administrador'];

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  readonly session = signal<MockAuthSession | null>(this.restoreSession());

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

    const session = { email: normalizedEmail, role };
    this.session.set(session);
    this.persistSession(session);
    return { kind: 'success', email: normalizedEmail, role };
  }

  signOut(): void {
    this.session.set(null);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private restoreSession(): MockAuthSession | null {
    try {
      const saved = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return null;
      const session: unknown = JSON.parse(saved);
      if (!this.isValidSession(session)) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private persistSession(session: MockAuthSession): void {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private isValidSession(value: unknown): value is MockAuthSession {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<MockAuthSession>;
    return typeof session.email === 'string' && session.email.length > 0 && AUTH_ROLES.includes(session.role as MockAuthRole);
  }
}
