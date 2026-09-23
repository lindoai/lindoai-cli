/**
 * Workspace Commands
 *
 * Commands for workspace operations.
 *
 * @satisfies Requirements 7.4
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Creates the workspace command.
 *
 * @returns The workspace command
 */
export function createWorkspaceCommand(): Command {
  const workspace = new Command('workspace').description('Workspace operations');

  // workspace get
  workspace
    .command('get')
    .description('Get workspace details')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.get();
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace credits
  workspace
    .command('credits')
    .description('Get workspace credit balance')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const credits = await client.workspace.getCredits();
        output(credits, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace client-credits
  workspace
    .command('client-credits')
    .description('Get credit balance for a specific client')
    .requiredOption('-c, --client <id>', 'Client ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { client: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const credits = await client.workspace.getClientCredits(options.client);
        output(credits, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace allocate-credits
  workspace
    .command('allocate-credits')
    .description('Allocate credits from your workspace to a client')
    .requiredOption('-c, --client <id>', 'Client ID to allocate credits to')
    .requiredOption(
      '-t, --type <type>',
      'Credit type (monthly | purchased | daily)',
    )
    .requiredOption('-a, --amount <amount>', 'Number of credits to allocate (positive integer)')
    .option('-s, --source <source>', 'Allocation source (e.g. bonus, purchase, promotion)')
    .option('-n, --notes <notes>', 'Optional notes for the allocation record')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(
      async (options: {
        client: string;
        type: string;
        amount: string;
        source?: string;
        notes?: string;
        format: OutputFormat;
      }) => {
        const creditType = options.type as 'monthly' | 'purchased' | 'daily';
        if (!['monthly', 'purchased', 'daily'].includes(creditType)) {
          error('Invalid credit type. Must be one of: monthly, purchased, daily');
          process.exit(1);
        }

        const amount = Number.parseInt(options.amount, 10);
        if (!Number.isFinite(amount) || amount <= 0) {
          error('Amount must be a positive integer');
          process.exit(1);
        }

        const client = getClient();
        try {
          const response = await client.workspace.allocateClientCredits({
            client_id: options.client,
            credit_type: creditType,
            amount,
            source: options.source,
            notes: options.notes,
          });
          if (response.success) {
            success('Credits allocated');
          }
          output(response, options.format);
        } catch (err) {
          handleError(err);
        }
      },
    );

  // workspace update
  workspace
    .command('update')
    .description('Update workspace settings')
    .option('-n, --name <name>', 'Workspace name')
    .option('-l, --language <lang>', 'Workspace language')
    .option('-w, --webhook <url>', 'Webhook URL')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { name?: string; language?: string; webhook?: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.update({
          workspace_name: options.name,
          workspace_language: options.language,
          webhook_url: options.webhook,
        });
        if (response.success) {
          success('Workspace updated');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace team-add
  workspace
    .command('team-add')
    .description('Add a team member to the workspace')
    .requiredOption('-e, --email <email>', 'Team member email')
    .option('-r, --role <role>', 'Role (Team)', 'Team')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { email: string; role: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.addTeamMember(options.email, options.role as 'Team');
        if (response.success) {
          success('Team member added');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace team-remove
  workspace
    .command('team-remove')
    .description('Remove a team member from the workspace')
    .requiredOption('-m, --member <id>', 'Member ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { member: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.removeTeamMember(options.member);
        if (response.success) {
          success('Team member removed');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace integration-add
  workspace
    .command('integration-add')
    .description('Add an integration to the workspace')
    .requiredOption('-t, --type <type>', 'Integration type (e.g., matomo)')
    .requiredOption('-c, --config <json>', 'Integration config as JSON')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { type: string; config: string; format: OutputFormat }) => {
      const client = getClient();
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(options.config);
      } catch {
        error('Invalid JSON config');
        process.exit(1);
      }
      try {
        const response = await client.workspace.addIntegration({
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

  // workspace integration-remove
  workspace
    .command('integration-remove')
    .description('Remove an integration from the workspace')
    .requiredOption('-t, --type <type>', 'Integration type')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { type: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.removeIntegration(options.type);
        if (response.success) {
          success('Integration removed');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace whitelabel
  workspace
    .command('whitelabel')
    .description('Setup or update whitelabel settings')
    .option('-d, --domain <domain>', 'Custom domain')
    .option('-s, --subdomain <domain>', 'Subdomain domain')
    .option('-e, --email-sender <email>', 'Email sender address')
    .option('--enable-register', 'Enable client registration')
    .option('--disable-register', 'Disable client registration')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { domain?: string; subdomain?: string; emailSender?: string; enableRegister?: boolean; disableRegister?: boolean; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.setupWhitelabel({
          domain: options.domain,
          subdomain_domain: options.subdomain,
          email_sender: options.emailSender,
          wl_client_register: options.enableRegister ? true : options.disableRegister ? false : undefined,
        });
        if (response.success) {
          success('Whitelabel settings updated');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workspace appearance
  workspace
    .command('appearance')
    .description('Update workspace appearance settings')
    .option('-p, --primary <color>', 'Primary color (hex)')
    .option('-s, --secondary <color>', 'Secondary color (hex)')
    .option('-m, --mode <mode>', 'Theme mode (light/dark)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { primary?: string; secondary?: string; mode?: string; format: OutputFormat }) => {
      const client = getClient();
      try {
        const response = await client.workspace.updateAppearance({
          primary_color: options.primary,
          secondary_color: options.secondary,
          theme_mode: options.mode as 'light' | 'dark' | undefined,
        });
        if (response.success) {
          success('Appearance settings updated');
        }
        output(response, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  return workspace;
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
