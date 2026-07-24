import { ActivatedRoute } from '@angular/router';
import { decrypt, encrypt } from './cryptage';
import { map, Observable } from 'rxjs';

export function formQuery(params: any): string {
  return (
    '?' +
    Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  );
}

export function getRouteParam(
  paramName: string,
  route: ActivatedRoute,
): string | null {
  // alert(encrypt(2))
  return decrypt(route.snapshot.paramMap.get(paramName)!);
}

export function getParamState(
  param: string,
): number | string {
  const params = history.state;
  return params[param] || 0;
}
