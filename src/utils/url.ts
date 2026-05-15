/**
 * URL Validation Utilities
 *
 * Provides functions for validating URLs, particularly for ensuring
 * callback URLs point to localhost for security purposes.
 *
 * @satisfies Requirements 5.1, 5.2, 5.3, 5.4
 */

/**
 * Validates that a URL points to localhost using the HTTP protocol.
 *
 * This function is used to ensure callback URLs in the OAuth-like login flow
 * can only redirect to the local machine, preventing API keys from being
 * sent to external servers.
 *
 * @param url - The URL string to validate
 * @returns True if the URL uses `http:` protocol and has hostname `localhost` or `127.0.0.1`, false otherwise
 *
 * @example
 * ```typescript
 * isLocalhostUrl('http://localhost:3000/callback'); // true
 * isLocalhostUrl('http://127.0.0.1:8080/path'); // true
 * isLocalhostUrl('https://localhost:3000/callback'); // false (wrong protocol)
 * isLocalhostUrl('http://example.com/callback'); // false (wrong hostname)
 * isLocalhostUrl('not a url'); // false (malformed)
 * ```
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check protocol is http: (not https: or other protocols)
    if (parsed.protocol !== 'http:') {
      return false;
    }

    // Check hostname is localhost or 127.0.0.1
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return false;
    }

    return true;
  } catch {
    // URL constructor throws for malformed URLs
    return false;
  }
}
