/**
 * Callback Server for Browser Login Flow
 *
 * Provides a temporary HTTP server that receives OAuth-like callbacks
 * from the webapp after user authorization. The server binds exclusively
 * to localhost for security.
 *
 * @satisfies Requirements 1.1, 1.7, 1.8, 1.9, 1.10, 2.1, 2.3, 2.4
 */

import * as http from 'node:http';
import { URL } from 'node:url';
import { verifyState } from '../utils/state.js';

/**
 * Result of a callback operation.
 */
export interface CallbackResult {
  /** Whether the callback was successful */
  success: boolean;
  /** The API key received (only present on success) */
  apiKey?: string;
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Parameters parsed from a callback URL.
 */
export interface CallbackParams {
  /** The API key (present on successful authorization) */
  key?: string;
  /** The state token for CSRF verification */
  state?: string;
  /** Error code (present when authorization failed) */
  error?: string;
  /** Human-readable error message */
  message?: string;
}

/**
 * Interface for the callback server.
 */
export interface CallbackServer {
  /**
   * Starts the server and returns connection info.
   * @returns Promise resolving to the port and full URL
   */
  start(): Promise<{ port: number; url: string }>;

  /**
   * Waits for a callback with the expected state token.
   * @param state - The expected state token
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns Promise resolving to the callback result
   */
  waitForCallback(state: string, timeoutMs: number): Promise<CallbackResult>;

  /**
   * Stops the server and cleans up resources.
   */
  stop(): Promise<void>;
}

/**
 * Parses callback parameters from a URL string.
 *
 * Extracts the key, state, error, and message query parameters
 * from a callback URL.
 *
 * @param url - The URL string to parse (can be full URL or just path with query)
 * @returns The parsed callback parameters
 *
 * @example
 * ```typescript
 * parseCallbackParams('/callback?key=abc123&state=xyz');
 * // { key: 'abc123', state: 'xyz' }
 *
 * parseCallbackParams('/callback?error=access_denied&message=User%20cancelled');
 * // { error: 'access_denied', message: 'User cancelled' }
 * ```
 */
export function parseCallbackParams(url: string): CallbackParams {
  try {
    // Handle both full URLs and relative paths
    const fullUrl = url.startsWith('http') ? url : `http://localhost${url}`;
    const parsed = new URL(fullUrl);
    const params = parsed.searchParams;

    return {
      key: params.get('key') ?? undefined,
      state: params.get('state') ?? undefined,
      error: params.get('error') ?? undefined,
      message: params.get('message') ?? undefined,
    };
  } catch {
    // Return empty params for malformed URLs
    return {};
  }
}

/**
 * Generates an HTML success page for the browser.
 *
 * @returns HTML string for successful authorization
 */
function generateSuccessHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Successful - Lindo CLI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Authorization Successful</h1>
    <p>You can close this window and return to your terminal.</p>
  </div>
</body>
</html>`;
}

/**
 * Generates an HTML error page for the browser.
 *
 * @param errorMessage - The error message to display
 * @returns HTML string for failed authorization
 */
function generateErrorHtml(errorMessage: string): string {
  // Escape HTML entities to prevent XSS
  const escapedMessage = errorMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Failed - Lindo CLI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
    .error-message {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✗</div>
    <h1>Authorization Failed</h1>
    <p>Something went wrong during authorization.</p>
    <div class="error-message">${escapedMessage}</div>
  </div>
</body>
</html>`;
}

/**
 * Generates an HTML 404 page for non-callback paths.
 *
 * @returns HTML string for 404 response
 */
function generate404Html(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not Found - Lindo CLI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 3rem;
      margin: 0 0 1rem 0;
      color: #999;
    }
    p {
      margin: 0;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This endpoint is not available.</p>
  </div>
</body>
</html>`;
}

/**
 * Creates a new callback server instance.
 *
 * The server binds exclusively to 127.0.0.1 for security, handles only
 * GET /callback requests, and returns HTML responses for both success
 * and error states.
 *
 * @returns A new CallbackServer instance
 *
 * @example
 * ```typescript
 * const server = createCallbackServer();
 * const { port, url } = await server.start();
 * console.log(`Callback server listening at ${url}`);
 *
 * const result = await server.waitForCallback(expectedState, 120000);
 * if (result.success) {
 *   console.log(`Received API key: ${result.apiKey}`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 *
 * await server.stop();
 * ```
 */
export function createCallbackServer(): CallbackServer {
  let server: http.Server | null = null;
  let pendingCallback: {
    expectedState: string;
    resolve: (result: CallbackResult) => void;
    timeoutId: NodeJS.Timeout;
  } | null = null;

  /**
   * Handles incoming HTTP requests.
   */
  function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // Only handle GET requests to /callback (with optional query string)
    // The path must be exactly "/callback" - not "/callbacks", "/callback/extra", etc.
    // Requirement 2.3: respond with 404 for paths other than /callback
    const isCallbackPath = url === '/callback' || url.startsWith('/callback?');
    if (method !== 'GET' || !isCallbackPath) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generate404Html());
      return;
    }

    // Parse callback parameters
    const params = parseCallbackParams(url);

    // Check if we're waiting for a callback
    if (!pendingCallback) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateErrorHtml('No pending authorization request'));
      return;
    }

    const { expectedState, resolve, timeoutId } = pendingCallback;

    // Clear the timeout since we received a callback
    clearTimeout(timeoutId);
    pendingCallback = null;

    // Check for error parameter
    if (params.error) {
      const errorMessage = params.message || params.error;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateErrorHtml(errorMessage));
      resolve({
        success: false,
        error: errorMessage,
      });
      return;
    }

    // Verify state token
    if (!params.state || !verifyState(params.state, expectedState)) {
      const errorMessage = 'State token mismatch - possible CSRF attack';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateErrorHtml(errorMessage));
      resolve({
        success: false,
        error: errorMessage,
      });
      return;
    }

    // Check for API key
    if (!params.key) {
      const errorMessage = 'No API key received';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateErrorHtml(errorMessage));
      resolve({
        success: false,
        error: errorMessage,
      });
      return;
    }

    // Success!
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateSuccessHtml());
    resolve({
      success: true,
      apiKey: params.key,
    });
  }

  return {
    async start(): Promise<{ port: number; url: string }> {
      return new Promise((resolve, reject) => {
        server = http.createServer(handleRequest);

        server.on('error', (err) => {
          reject(new Error(`Failed to start callback server: ${err.message}`));
        });

        // Bind exclusively to 127.0.0.1 for security (Requirement 2.1)
        server.listen(0, '127.0.0.1', () => {
          const address = server!.address();
          if (!address || typeof address === 'string') {
            reject(new Error('Failed to get server address'));
            return;
          }

          const port = address.port;
          const url = `http://127.0.0.1:${port}/callback`;
          resolve({ port, url });
        });
      });
    },

    waitForCallback(state: string, timeoutMs: number): Promise<CallbackResult> {
      return new Promise((resolve) => {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (pendingCallback) {
            pendingCallback = null;
            resolve({
              success: false,
              error: 'Login timed out waiting for authorization',
            });
          }
        }, timeoutMs);

        // Store the pending callback info
        pendingCallback = {
          expectedState: state,
          resolve,
          timeoutId,
        };
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        // Clear any pending callback
        if (pendingCallback) {
          clearTimeout(pendingCallback.timeoutId);
          pendingCallback = null;
        }

        if (server) {
          server.close(() => {
            server = null;
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
  };
}
