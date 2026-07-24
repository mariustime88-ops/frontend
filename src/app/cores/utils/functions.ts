export function formParamsToQueryString(params: any): string {
  return '?' + Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
