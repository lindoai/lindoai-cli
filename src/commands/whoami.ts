/**
 * Whoami Command
 *
 * Displays the current authenticated workspace details.
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { error, info, output, type OutputFormat } from '../output';

/**
 * Creates the whoami command.
 *
 * @returns The whoami command
 */
export function createWhoamiCommand(): Command {
  const whoami = new Command('whoami')
    .description('Show the current authenticated workspace')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { format: OutputFormat }) => {
      if (!hasApiKey()) {
        error('Not logged in');
        info('Run: lindo login');
        info('Or: lindo config set apiKey <your-api-key>');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new LindoClient({
        apiKey: config.apiKey!,
        baseUrl: config.baseUrl,
      });

      try {
        const response = await client.workspace.get();
        output(response, options.format);
      } catch (err) {
        if (err instanceof AuthenticationError) {
          error('Authentication failed — API key may be invalid or expired');
          info('Run: lindo login');
          process.exit(1);
        }
        if (err instanceof Error) {
          error(err.message);
        } else {
          error('An unexpected error occurred');
        }
        process.exit(1);
      }
    });

  return whoami;
}
