/**
 * Live Preview Server with SSE Hot-Reload
 *
 * Provides a local HTTP server that serves HTML files with automatic
 * browser refresh via Server-Sent Events (SSE) when the file changes.
 *
 * @satisfies Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * JavaScript snippet that establishes an SSE connection for live reload.
 * This script connects to the /__live-reload endpoint and reloads the page
 * when it receives a 'reload' event.
 */
export const LIVE_RELOAD_SCRIPT = `<script>
(function() {
  var eventSource = new EventSource('/__live-reload');
  eventSource.onmessage = function(event) {
    if (event.data === 'reload') {
      window.location.reload();
    }
  };
  eventSource.onerror = function() {
    console.log('[Live Reload] Connection lost, attempting to reconnect...');
  };
})();
</script>`;

/**
 * Injects the live reload script into HTML content.
 *
 * If the HTML contains a `</body>` tag, the script is inserted before it.
 * Otherwise, the script is appended at the end of the content.
 *
 * @param html - The HTML content to inject the script into
 * @returns The HTML content with the live reload script injected
 *
 * @example
 * ```typescript
 * // With </body> tag
 * injectLiveReload('<html><body><h1>Hello</h1></body></html>');
 * // Returns: '<html><body><h1>Hello</h1><script>...</script></body></html>'
 *
 * // Without </body> tag
 * injectLiveReload('<h1>Hello</h1>');
 * // Returns: '<h1>Hello</h1><script>...</script>'
 * ```
 *
 * @satisfies Requirements 8.2, 8.3
 */
export function injectLiveReload(html: string): string {
  // Case-insensitive search for </body> tag
  const bodyCloseTagRegex = /<\/body>/i;
  const match = html.match(bodyCloseTagRegex);

  if (match && match.index !== undefined) {
    // Insert script before </body> tag
    return (
      html.slice(0, match.index) +
      LIVE_RELOAD_SCRIPT +
      html.slice(match.index)
    );
  }

  // No </body> tag found, append script at the end
  return html + LIVE_RELOAD_SCRIPT;
}

/**
 * Starts a live preview server for the specified HTML file.
 *
 * The server:
 * - Serves the HTML file on GET / with the live reload script injected
 * - Exposes an SSE endpoint at /__live-reload for browser connections
 * - Watches the file for changes and notifies connected clients with 100ms debounce
 * - Binds to 127.0.0.1 on a dynamically allocated port
 *
 * @param filePath - Path to the HTML file to serve
 * @returns Promise resolving to the port number the server is listening on
 *
 * @example
 * ```typescript
 * const port = await startLivePreviewServer('./page.html');
 * console.log(`Preview server running at http://127.0.0.1:${port}/`);
 * ```
 *
 * @satisfies Requirements 8.1, 8.4, 8.5, 8.6, 8.7
 */
export function startLivePreviewServer(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Resolve to absolute path
    const absolutePath = path.resolve(filePath);

    // Track connected SSE clients
    const sseClients: Set<http.ServerResponse> = new Set();

    // Debounce timer for file changes
    let debounceTimer: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 100;

    /**
     * Notifies all connected SSE clients to reload.
     */
    function notifyClients(): void {
      for (const client of sseClients) {
        try {
          client.write('data: reload\n\n');
        } catch {
          // Client may have disconnected, remove from set
          sseClients.delete(client);
        }
      }
    }

    /**
     * Handles file change events with debouncing.
     */
    function handleFileChange(): void {
      // Clear existing timer if any
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounce timer
      debounceTimer = setTimeout(() => {
        notifyClients();
        debounceTimer = null;
      }, DEBOUNCE_MS);
    }

    /**
     * Handles incoming HTTP requests.
     */
    function handleRequest(
      req: http.IncomingMessage,
      res: http.ServerResponse
    ): void {
      const url = req.url || '/';
      const method = req.method || 'GET';

      // Only handle GET requests
      if (method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }

      // Handle SSE endpoint for live reload
      if (url === '/__live-reload') {
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        // Send initial connection message
        res.write('data: connected\n\n');

        // Add client to the set
        sseClients.add(res);

        // Remove client when connection closes
        req.on('close', () => {
          sseClients.delete(res);
        });

        return;
      }

      // Handle root path - serve the HTML file
      if (url === '/' || url === '/index.html') {
        try {
          // Read the HTML file
          const html = fs.readFileSync(absolutePath, 'utf-8');

          // Inject live reload script
          const injectedHtml = injectLiveReload(html);

          // Send response
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          });
          res.end(injectedHtml);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
<h1>Error loading file</h1>
<p>${errorMessage}</p>
</body>
</html>`);
        }
        return;
      }

      // All other paths return 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Not Found</title></head>
<body>
<h1>404 Not Found</h1>
<p>The requested resource was not found.</p>
</body>
</html>`);
    }

    // Create HTTP server
    const server = http.createServer(handleRequest);

    // Set up file watcher
    let watcher: fs.FSWatcher | null = null;

    server.on('error', (err) => {
      reject(new Error(`Failed to start preview server: ${err.message}`));
    });

    // Bind to 127.0.0.1:0 (dynamically allocated port)
    // Requirement 8.6: bind to 127.0.0.1 on a dynamically allocated port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }

      const port = address.port;

      // Start watching the file for changes
      // Requirement 8.5: watch file with 100ms debounce
      try {
        watcher = fs.watch(absolutePath, (eventType) => {
          if (eventType === 'change') {
            handleFileChange();
          }
        });

        watcher.on('error', (err) => {
          console.error(`[Live Preview] File watcher error: ${err.message}`);
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Live Preview] Failed to watch file: ${errorMessage}`);
      }

      // Handle SIGTERM for graceful shutdown
      // Requirement 8.7: clean up PID and port files on SIGTERM
      const handleShutdown = () => {
        // Close file watcher
        if (watcher) {
          watcher.close();
          watcher = null;
        }

        // Clear debounce timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        // Close all SSE connections
        for (const client of sseClients) {
          try {
            client.end();
          } catch {
            // Ignore errors when closing
          }
        }
        sseClients.clear();

        // Clean up PID and port files
        const pidFilePath = path.join(os.tmpdir(), 'lindoai-pages-preview.pid');
        const portFilePath = path.join(os.tmpdir(), 'lindoai-pages-preview.port');

        try {
          if (fs.existsSync(pidFilePath)) {
            fs.unlinkSync(pidFilePath);
          }
        } catch {
          // Ignore errors when cleaning up
        }

        try {
          if (fs.existsSync(portFilePath)) {
            fs.unlinkSync(portFilePath);
          }
        } catch {
          // Ignore errors when cleaning up
        }

        // Close server
        server.close(() => {
          process.exit(0);
        });

        // Force exit after timeout
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      };

      process.on('SIGTERM', handleShutdown);
      process.on('SIGINT', handleShutdown);

      resolve(port);
    });
  });
}
