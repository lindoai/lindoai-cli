/**
 * Browser Opener Utilities
 *
 * Provides functions for opening URLs in the user's default browser
 * using platform-specific commands.
 *
 * @satisfies Requirements 1.3
 */

import { exec } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Opens a URL in the user's default browser.
 *
 * Uses platform-specific commands to open the browser:
 * - macOS: `open`
 * - Linux: `xdg-open`
 * - Windows: `start`
 *
 * @param url - The URL to open in the browser
 * @returns A promise that resolves to `true` if the browser was opened successfully, `false` otherwise
 *
 * @example
 * ```typescript
 * const success = await openBrowser('https://example.com');
 * if (!success) {
 *   console.log('Failed to open browser. Please visit the URL manually.');
 * }
 * ```
 */
export function openBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const currentPlatform = platform();
    let command: string;

    switch (currentPlatform) {
      case 'darwin':
        // macOS
        command = `open "${url}"`;
        break;
      case 'win32':
        // Windows - use start command with empty title
        command = `start "" "${url}"`;
        break;
      default:
        // Linux and other Unix-like systems
        command = `xdg-open "${url}"`;
        break;
    }

    exec(command, (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
