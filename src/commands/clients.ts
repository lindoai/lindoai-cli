/**
 * Clients Commands
 *
 * Commands for client management operations.
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Creates the clients command.
 *
 * @returns The clients command
 */
export function createClientsCommand(): Command {
  const clients = new Command('clients').description('Client management operations');

  // clients list
  clients
    .command('list')
    .description('List all workspace clients')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-s, --search <search>', 'Search term')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { page: string; search?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.clients.list({
          page: parseInt(options.page, 10),
          search: options.search,
        });
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.clients && response.clients.length > 0) {
            console.log('\nClients:');
            console.log('--------');
            for (const c of response.clients) {
              console.log(`  ID: ${c.record_id}`);
              console.log(`  Email: ${c.email}`);
              console.log(`  Website Limit: ${c.website_limit ?? 'N/A'}`);
              console.log(`  Suspended: ${c.suspended ?? false}`);
              console.log('');
            }
            console.log(`Total: ${response.total ?? response.clients.length}`);
          } else {
            info('No clients found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // clients create
  clients
    .command('create')
    .description('Create a new workspace client')
    .requiredOption('-e, --email <email>', 'Client email address')
    .option('-l, --limit <limit>', 'Website limit', '5')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { email: string; limit: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.clients.create({
          email: options.email,
          website_limit: parseInt(options.limit, 10),
        });
        
        if (response.success && response.client) {
          success(`Client created: ${response.client.record_id}`);
          output(response.client, options.format);
        } else {
          error('Failed to create client');
          if (response.errors) {
            for (const e of response.errors) {
              error(`  ${e}`);
            }
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // clients update
  clients
    .command('update')
    .description('Update a workspace client')
    .requiredOption('-i, --id <id>', 'Client ID')
    .option('-l, --limit <limit>', 'Website limit')
    .option('--suspend', 'Suspend the client')
    .option('--unsuspend', 'Unsuspend the client')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; limit?: string; suspend?: boolean; unsuspend?: boolean; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.clients.update({
          client_id: options.id,
          website_limit: options.limit ? parseInt(options.limit, 10) : undefined,
          suspended: options.suspend ? true : options.unsuspend ? false : undefined,
        });
        
        if (response.success) {
          success('Client updated');
          if (response.client) {
            output(response.client, options.format);
          }
        } else {
          error('Failed to update client');
          if (response.errors) {
            for (const e of response.errors) {
              error(`  ${e}`);
            }
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // clients delete
  clients
    .command('delete')
    .description('Delete a workspace client')
    .requiredOption('-i, --id <id>', 'Client ID')
    .action(async (options: { id: string }) => {
      const client = getClient();

      try {
        const response = await client.clients.delete(options.id);
        
        if (response.success) {
          success('Client deleted');
        } else {
          error('Failed to delete client');
          if (response.errors) {
            for (const e of response.errors) {
              error(`  ${e}`);
            }
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // clients magic-link
  clients
    .command('magic-link')
    .description('Create a magic link for client authentication')
    .requiredOption('-e, --email <email>', 'Client email address')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { email: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.clients.createMagicLink(options.email);
        
        if (response.success) {
          success('Magic link created');
          output(response, options.format);
        } else {
          error('Failed to create magic link');
          if (response.errors) {
            for (const e of response.errors) {
              error(`  ${e}`);
            }
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  return clients;
}

/**
 * Gets a configured LindoClient.
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
