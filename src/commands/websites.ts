/**
 * Websites Commands
 *
 * Commands for website management operations.
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Creates the websites command.
 *
 * @returns The websites command
 */
export function createWebsitesCommand(): Command {
  const websites = new Command('websites').description('Website management operations');

  // websites list
  websites
    .command('list')
    .description('List all workspace websites')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-s, --search <search>', 'Search term')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { page: string; search?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.websites.list({
          page: parseInt(options.page, 10),
          search: options.search,
        });
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          const list = response.result?.list ?? [];
          if (list.length > 0) {
            console.log('\nWebsites:');
            console.log('---------');
            for (const w of list) {
              console.log(`  ID: ${w.website_id}`);
              console.log(`  Name: ${w.website_name ?? 'N/A'}`);
              console.log(`  Domain: ${w.domain ?? 'N/A'}`);
              console.log(`  Activated: ${w.activated ?? false}`);
              console.log('');
            }
            console.log(`Total: ${response.result?.total ?? list.length}`);
          } else {
            info('No websites found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // websites get
  websites
    .command('get')
    .description('Get website details')
    .requiredOption('-i, --id <id>', 'Website ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.getDetails(options.id);
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites update
  websites
    .command('update')
    .description('Update a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .option('-n, --name <name>', 'Business name')
    .option('--activate', 'Activate the website')
    .option('--deactivate', 'Deactivate the website')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; name?: string; activate?: boolean; deactivate?: boolean; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.websites.update({
          website_id: options.id,
          business_name: options.name,
          activated: options.activate ? true : options.deactivate ? false : undefined,
        });
        
        if (response.success) {
          success('Website updated');
          if (response.website) {
            output(response.website, options.format);
          }
        } else {
          error('Failed to update website');
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

  // websites settings
  websites
    .command('settings')
    .description('Update website settings')
    .requiredOption('-i, --id <id>', 'Website ID')
    .option('-n, --name <name>', 'Business name')
    .option('-l, --language <lang>', 'Language')
    .option('-d, --description <desc>', 'Business description')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; name?: string; language?: string; description?: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.updateSettings(options.id, {
          business_name: options.name,
          language: options.language,
          business_description: options.description,
        });
        if (response.success) {
          success('Website settings updated');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites delete
  websites
    .command('delete')
    .description('Delete a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .action(async (options: { id: string }) => {
      const client = getClient();

      try {
        const response = await client.websites.delete(options.id);
        
        if (response.success) {
          success('Website deleted');
        } else {
          error('Failed to delete website');
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

  // websites assign
  websites
    .command('assign')
    .description('Assign a website to a client')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-c, --client <id>', 'Client ID')
    .action(async (options: { website: string; client: string }) => {
      const client = getClient();

      try {
        const response = await client.websites.assign({
          website_id: options.website,
          client_id: options.client,
        });
        
        if (response.success) {
          success('Website assigned to client');
        } else {
          error('Failed to assign website');
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

  // websites domain-add
  websites
    .command('domain-add')
    .description('Add a custom domain to a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .requiredOption('-d, --domain <domain>', 'Custom domain')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; domain: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.addDomain(options.id, options.domain);
        if (response.success) {
          success('Domain added');
          if (response.result?.dns_records) {
            console.log('\nDNS Records to configure:');
            for (const record of response.result.dns_records) {
              console.log(`  ${record.record_type} ${record.host} -> ${record.value}`);
            }
          }
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites domain-remove
  websites
    .command('domain-remove')
    .description('Remove a custom domain from a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.removeDomain(options.id);
        if (response.success) {
          success('Domain removed');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites integration-add
  websites
    .command('integration-add')
    .description('Add an integration to a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .requiredOption('-t, --type <type>', 'Integration type (e.g., matomo)')
    .requiredOption('-c, --config <json>', 'Integration config as JSON')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; type: string; config: string; format: OutputFormat }) => {
      const client = getClient();
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(options.config);
      } catch {
        error('Invalid JSON config');
        process.exit(1);
      }
      try {
        const response = await client.websites.addIntegration(options.id, {
          integration_type: options.type,
          config,
        });
        if (response.success) {
          success('Integration added');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites integration-remove
  websites
    .command('integration-remove')
    .description('Remove an integration from a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .requiredOption('-t, --type <type>', 'Integration type')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; type: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.removeIntegration(options.id, options.type);
        if (response.success) {
          success('Integration removed');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites team-add
  websites
    .command('team-add')
    .description('Add a team member to a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .requiredOption('-e, --email <email>', 'Team member email')
    .requiredOption('-r, --role <role>', 'Role (Editor or Commenter)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; email: string; role: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.addTeamMember(options.id, options.email, options.role as 'Editor' | 'Commenter');
        if (response.success) {
          success('Team member added');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // websites team-remove
  websites
    .command('team-remove')
    .description('Remove a team member from a website')
    .requiredOption('-i, --id <id>', 'Website ID')
    .requiredOption('-m, --member <memberId>', 'Member ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { id: string; member: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.websites.removeTeamMember(options.id, options.member);
        if (response.success) {
          success('Team member removed');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  return websites;
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
