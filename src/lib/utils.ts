export function decodeJwtPayload(token: string): { sub: number; name: string } | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const base64Standard = base64
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(base64Standard);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
