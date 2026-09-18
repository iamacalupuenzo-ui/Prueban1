import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { MockAuthService } from './mock-auth.service';

export const authGuard: CanActivateChildFn = (_route, state) => {
  const auth = inject(MockAuthService);
  if (auth.session()) return true;

  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
