/**
 * Analytics Commands
 *
 * Commands for analytics operations.
 *
 * @satisfies Requirements 7.4
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { error, info, output, type OutputFormat } from '../output';

/**
 * Creates the analytics command.
 *
 * @returns The analytics command
 */
export function createAnalyticsCommand(): Command {
  const analytics = new Command('analytics').description('Analytics operations');

  // analytics workspace
  analytics
    .command('workspace')
    .description('Get workspace analytics')
    .option('--from <date>', 'Start date (ISO format)')
    .option('--to <date>', 'End date (ISO format)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { from?: string; to?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const analytics = await client.analytics.getWorkspace({
          from: options.from,
          to: options.to,
        });
        output(analytics, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // analytics website
  analytics
    .command('website')
    .description('Get website analytics')
    .requiredOption('-w, --website <id>', 'Website ID (required)')
    .option('--from <date>', 'Start date (ISO format)')
    .option('--to <date>', 'End date (ISO format)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; from?: string; to?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const analytics = await client.analytics.getWebsite({
          website_id: options.website,
          from: options.from,
          to: options.to,
        });
        output(analytics, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  return analytics;
}

/**
 * Gets an authenticated client.
 *
 * @returns The Lindo client
 */
function getClient(): LindoClient {
  if (!hasApiKey()) {
    error('API key not configured');
    info('Run: lindo config set apiKey <your-api-key>');
    info('Or set the LINDO_API_KEY environment variable');
    process.exit(1);
  }

  const config = loadConfig();
  return new LindoClient({
    apiKey: config.apiKey!,
    baseUrl: config.baseUrl,
  });
}

/**
 * Handles errors from API calls.
 *
 * @param err - The error to handle
 */
function handleError(err: unknown): never {
  if (err instanceof AuthenticationError) {
    error('Authentication failed');
    info('Your API key may be invalid or expired');
    info('Run: lindo config set apiKey <your-api-key>');
    process.exit(1);
  }

  if (err instanceof Error) {
    error(err.message);
  } else {
    error('An unexpected error occurred');
  }

  process.exit(1);
}
