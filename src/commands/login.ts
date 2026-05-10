/**
 * Login Command
 *
 * Implements browser-based authentication for the CLI.
 * Orchestrates the full login flow: start callback server → generate state →
 * open browser → wait for callback → save API key → shutdown.
 *
 * @satisfies Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
 */

import { Command } from 'commander';
import { createCallbackServer } from '../server/callback.js';
import { generateState } from '../utils/state.js';
import { openBrowser } from '../utils/browser.js';
import { saveApiKey, getConfigPath } from '../config.js';
import { success, error, info } from '../output.js';

/**
 * The base URL for the Lindo webapp authorization page.
 */
const WEBAPP_BASE_URL = 'https://app.lindo.ai';

/**
 * Default timeout for the login flow in seconds.
 */
const DEFAULT_TIMEOUT_SECONDS = 120;

/**
 * Builds the authorization URL for the browser login flow.
 *
 * Constructs a URL to the webapp consent page with the state token
 * and callback URL as query parameters.
 *
 * @param state - The state token for CSRF protection
 * @param callbackPort - The port number of the callback server
 * @returns The full authorization URL
 *
 * @example
 * ```typescript
 * const url = buildAuthorizationUrl('abc123...', 3456);
 * // Returns: https://app.lindo.ai/cli/authorize?state=abc123...&callback_url=http://127.0.0.1:3456/callback
 * ```
 */
export function buildAuthorizationUrl(state: string, callbackPort: number): string {
  const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;
  const params = new URLSearchParams({
    state,
    callback_url: callbackUrl,
  });
  return `${WEBAPP_BASE_URL}/cli/authorize?${params.toString()}`;
}

/**
 * Creates the login command.
 *
 * The login command implements a browser-based OAuth-like flow:
 * 1. Starts a temporary callback server on localhost
 * 2. Generates a cryptographic state token for CSRF protection
 * 3. Opens the user's browser to the consent page
 * 4. Waits for the callback with the API key
 * 5. Saves the API key to the config file
 * 6. Shuts down the callback server
 *
 * @returns The login command
 *
 * @example
 * ```bash
 * # Basic login
 * lindoai login
 *
 * # Login with custom timeout
 * lindoai login --timeout 60
 *
 * # Login without opening browser (manual URL copy)
 * lindoai login --no-browser
 * ```
 */
export function createLoginCommand(): Command {
  const login = new Command('login')
    .description('Authenticate via browser to configure your API key')
    .option(
      '-t, --timeout <seconds>',
      'Timeout in seconds for the login flow',
      String(DEFAULT_TIMEOUT_SECONDS)
    )
    .option(
      '--no-browser',
      'Display the authorization URL without opening the browser'
    )
    .action(async (options: { timeout: string; browser: boolean }) => {
      const timeoutSeconds = parseInt(options.timeout, 10);
      const timeoutMs = timeoutSeconds * 1000;
      const shouldOpenBrowser = options.browser;

      // Create and start the callback server
      const server = createCallbackServer();
      let serverStarted = false;

      try {
        info('Starting authentication flow...');

        // Start the callback server (Requirement 1.1)
        const { port } = await server.start();
        serverStarted = true;

        // Generate state token for CSRF protection (Requirement 1.2)
        const state = generateState();

        // Build the authorization URL (Requirement 1.3)
        const authUrl = buildAuthorizationUrl(state, port);

        if (shouldOpenBrowser) {
          // Open browser to consent page (Requirement 1.3)
          info('Opening browser for authorization...');
          const browserOpened = await openBrowser(authUrl);

          if (!browserOpened) {
            // Browser failed to open, show URL for manual copy
            info('Could not open browser automatically.');
            console.log('\nPlease open this URL in your browser:');
            console.log(`\n  ${authUrl}\n`);
          }
        } else {
          // --no-browser option: display URL without opening (Requirement 1.4)
          console.log('\nPlease open this URL in your browser:');
          console.log(`\n  ${authUrl}\n`);
        }

        info(`Waiting for authorization (timeout: ${timeoutSeconds}s)...`);

        // Wait for callback with timeout (Requirements 1.5, 1.6, 1.7, 1.8, 1.9)
        const result = await server.waitForCallback(state, timeoutMs);

        if (result.success && result.apiKey) {
          // Save API key to config file (Requirement 1.7)
          saveApiKey(result.apiKey);
          success('Successfully authenticated!');
          info(`API key saved to: ${getConfigPath()}`);
        } else {
          // Handle errors (Requirements 1.6, 1.8, 1.9)
          error(result.error || 'Authentication failed');
          process.exit(1);
        }
      } catch (err) {
        // Handle server startup or other errors
        error(err instanceof Error ? err.message : 'An unexpected error occurred');
        process.exit(1);
      } finally {
        // Shutdown callback server (Requirement 1.10)
        if (serverStarted) {
          await server.stop();
        }
      }
    });

  return login;
}
