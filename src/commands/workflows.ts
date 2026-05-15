/**
 * Workflows Commands
 *
 * Commands for managing workflows.
 *
 * @satisfies Requirements 7.4
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Creates the workflows command.
 *
 * @returns The workflows command
 */
export function createWorkflowsCommand(): Command {
  const workflows = new Command('workflows').description('Manage workflows');

  // workflows list
  workflows
    .command('list')
    .description('List workflow logs')
    .option('-n, --name <name>', 'Filter by workflow name')
    .option('-s, --status <status>', 'Filter by status')
    .option('-w, --website <id>', 'Filter by website ID')
    .option('-c, --client <id>', 'Filter by client ID')
    .option('-l, --limit <number>', 'Maximum number of results', '50')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { name?: string; status?: string; website?: string; client?: string; limit: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const result = await client.workflows.list({
          workflow_name: options.name,
          status: options.status,
          website_id: options.website,
          client_id: options.client,
          limit: parseInt(options.limit),
        });

        if (result.success) {
          output(result.data, options.format);
        } else {
          error('Failed to list workflows');
          process.exit(1);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // workflows start <workflow-name>
  workflows
    .command('start <workflow-name>')
    .description('Start a workflow')
    .option('-p, --params <json>', 'Workflow parameters as JSON string', '{}')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowName: string, options: { params: string; format: OutputFormat }) => {
      const client = getClient();

      let params: Record<string, unknown>;
      try {
        params = JSON.parse(options.params);
      } catch {
        error('Invalid JSON params');
        info('Example: --params \'{"page_id": "page-123"}\'');
        process.exit(1);
      }

      try {
        info(`Starting workflow: ${workflowName}`);

        const result = await client.workflows.start({
          workflow_name: workflowName,
          params,
        });

        if (result.success) {
          success(`Workflow started: ${result.instance_id}`);
          output(result, options.format);
        } else {
          error('Failed to start workflow');
          output(result, options.format);
          process.exit(1);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // workflows status <instance-id>
  workflows
    .command('status <instance-id>')
    .description('Get workflow status')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (instanceId: string, options: { format: OutputFormat }) => {
      const client = getClient();

      try {
        const status = await client.workflows.getStatus(instanceId);
        output(status, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows status-website <workflow-id>
  workflows
    .command('status-website <workflow-id>')
    .description('Check the status of a website-creation workflow (started via create-website)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowId: string, options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const status = await client.workflows.getWebsiteStatus(workflowId);
        const r = status.result;
        if (r && !r.done) info(`Status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(status, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows status-page <workflow-id>
  workflows
    .command('status-page <workflow-id>')
    .description('Check the status of a page-creation workflow (started via create-page)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowId: string, options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const status = await client.workflows.getPageStatus(workflowId);
        const r = status.result;
        if (r && !r.done) info(`Status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(status, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows status-blog <workflow-id>
  workflows
    .command('status-blog <workflow-id>')
    .description('Check the status of a blog-creation workflow (started via create-blog)')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowId: string, options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const status = await client.workflows.getBlogStatus(workflowId);
        const r = status.result;
        if (r && !r.done) info(`Status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(status, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows pause <instance-id>
  workflows
    .command('pause <instance-id>')
    .description('Pause a running workflow')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (instanceId: string, options: { format: OutputFormat }) => {
      const client = getClient();

      try {
        info(`Pausing workflow: ${instanceId}`);
        const result = await client.workflows.pause(instanceId);

        if (result.success) {
          success(result.message);
        } else {
          error(result.message);
          process.exit(1);
        }

        output(result, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows resume <instance-id>
  workflows
    .command('resume <instance-id>')
    .description('Resume a paused workflow')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (instanceId: string, options: { format: OutputFormat }) => {
      const client = getClient();

      try {
        info(`Resuming workflow: ${instanceId}`);
        const result = await client.workflows.resume(instanceId);

        if (result.success) {
          success(result.message);
        } else {
          error(result.message);
          process.exit(1);
        }

        output(result, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows terminate <instance-id>
  workflows
    .command('terminate <instance-id>')
    .description('Terminate a workflow')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (instanceId: string, options: { format: OutputFormat }) => {
      const client = getClient();

      try {
        info(`Terminating workflow: ${instanceId}`);
        const result = await client.workflows.terminate(instanceId);

        if (result.success) {
          success(result.message);
        } else {
          error(result.message);
          process.exit(1);
        }

        output(result, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // ===================================================================
  // Batch commands
  // ===================================================================

  /**
   * Load a JSON array of items from a file path or inline JSON string.
   * Used by `batch-create-*` commands.
   */
  function loadItems(source: string): any[] {
    let raw: string;
    try {
      // If it's a path that exists on disk, read it; otherwise treat as inline JSON.
      const fs = require('fs');
      if (fs.existsSync(source)) {
        raw = fs.readFileSync(source, 'utf8');
      } else {
        raw = source;
      }
    } catch {
      raw = source;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Items must be a JSON array');
    }
    return parsed;
  }

  // workflows batch-create-websites <items>
  workflows
    .command('batch-create-websites <items>')
    .description('Create up to 25 websites at once. Pass a JSON array file path or inline JSON.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (source: string, options: { format: OutputFormat }) => {
      const client = getClient();
      let items: any[];
      try {
        items = loadItems(source);
      } catch (err) {
        error(`Invalid items JSON: ${(err as Error).message}`);
        info('Example: --items \'[{"prompt":"..."},{"prompt":"..."}]\'');
        process.exit(1);
      }
      try {
        info(`Starting batch of ${items.length} websites…`);
        const res = await client.workflows.batchCreateWebsites(items);
        const r = res.result;
        if (r) success(`Batch accepted: ${r.succeeded} succeeded, ${r.failed} failed of ${r.total}.`);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows batch-create-pages <website-id> <items>
  workflows
    .command('batch-create-pages <website-id> <items>')
    .description('Create up to 25 pages on a website at once. Pass a JSON array file path or inline JSON.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, source: string, options: { format: OutputFormat }) => {
      const client = getClient();
      let items: any[];
      try {
        items = loadItems(source);
      } catch (err) {
        error(`Invalid items JSON: ${(err as Error).message}`);
        process.exit(1);
      }
      try {
        info(`Starting batch of ${items.length} pages on ${websiteId}…`);
        const res = await client.workflows.batchCreatePages(websiteId, items);
        const r = res.result;
        if (r) success(`Batch accepted: ${r.succeeded} succeeded, ${r.failed} failed of ${r.total}.`);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows batch-create-blogs <website-id> <items>
  workflows
    .command('batch-create-blogs <website-id> <items>')
    .description('Create up to 25 blog posts on a website at once. Pass a JSON array file path or inline JSON.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, source: string, options: { format: OutputFormat }) => {
      const client = getClient();
      let items: any[];
      try {
        items = loadItems(source);
      } catch (err) {
        error(`Invalid items JSON: ${(err as Error).message}`);
        process.exit(1);
      }
      try {
        info(`Starting batch of ${items.length} blog posts on ${websiteId}…`);
        const res = await client.workflows.batchCreateBlogs(websiteId, items);
        const r = res.result;
        if (r) success(`Batch accepted: ${r.succeeded} succeeded, ${r.failed} failed of ${r.total}.`);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows batch-status-websites <workflow-ids...>
  workflows
    .command('batch-status-websites <workflow-ids...>')
    .description('Check the status of up to 25 website workflows at once.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowIds: string[], options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const res = await client.workflows.batchCheckWebsiteStatus(workflowIds);
        const r = res.result;
        if (r && !r.done) info(`Batch status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows batch-status-pages <workflow-ids...>
  workflows
    .command('batch-status-pages <workflow-ids...>')
    .description('Check the status of up to 25 page workflows at once.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowIds: string[], options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const res = await client.workflows.batchCheckPageStatus(workflowIds);
        const r = res.result;
        if (r && !r.done) info(`Batch status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // workflows batch-status-blogs <workflow-ids...>
  workflows
    .command('batch-status-blogs <workflow-ids...>')
    .description('Check the status of up to 25 blog workflows at once.')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (workflowIds: string[], options: { format: OutputFormat }) => {
      const client = getClient();
      try {
        const res = await client.workflows.batchCheckBlogStatus(workflowIds);
        const r = res.result;
        if (r && !r.done) info(`Batch status: ${r.status} — ${r.message}`);
        else if (r) success(r.message);
        output(res, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  return workflows;
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
