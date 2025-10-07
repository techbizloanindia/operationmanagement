/**
 * Utility to get the base URL for API calls and redirects
 */
export function getBaseUrl(request?: Request): string {
  // In production, try to get from environment variables first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // If we have a request object, try to construct from host header
  if (request) {
    const host = request.headers.get('host');
    if (host) {
      const protocol = request.headers.get('x-forwarded-proto') ||
                      (host.includes('localhost') ? 'http' : 'https');
      return `${protocol}://${host}`;
    }
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback - should not reach here in production
  return '';
}