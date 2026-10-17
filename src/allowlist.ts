/**
 * Which hosts the broker will redirect a callback to.
 *
 * The public instance only allows local development hosts, so a crafted
 * client can only ever send an authorization code back to the machine of the
 * person who approved it. Self-hosters can widen this, for example to
 * "*.staging.example.com".
 */

export const DEFAULT_ALLOWED_HOSTS = 'localhost,127.0.0.1,[::1],*.test,*.localhost,*.local'

export function parseAllowedHosts(value: string | undefined): string[] {
  const source = value?.trim() ? value : DEFAULT_ALLOWED_HOSTS

  return source
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter((pattern) => pattern.length > 0)
}

/**
 * Exact hosts match themselves. "*.test" matches any subdomain of "test" at
 * any depth, but not "test" itself. A bare "*" is never honored.
 */
export function isAllowedHost(hostname: string, patterns: string[]): boolean {
  const host = hostname.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1)

      return host.endsWith(suffix) && host.length > suffix.length
    }

    return pattern === host
  })
}
