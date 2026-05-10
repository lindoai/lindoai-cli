/**
 * Agents Commands
 *
 * Commands for running AI agents.
 *
 * @satisfies Requirements 7.4
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Creates the agents command.
 *
 * @returns The agents command
 */
export function createAgentsCommand(): Command {
  const agents = new Command('agents').description('Run AI agents');

  // agents run <agent-id>
  agents
    .command('run <agent-id>')
    .description('Run an AI agent')
    .option('-i, --input <json>', 'Input data as JSON string', '{}')
    .option('-s, --stream', 'Stream the response', false)
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (agentId: string, options: { input: string; stream: boolean; format: OutputFormat }) => {
      if (!hasApiKey()) {
        error('API key not configured');
        info('Run: lindo config set apiKey <your-api-key>');
        info('Or set the LINDO_API_KEY environment variable');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new LindoClient({
        apiKey: config.apiKey!,
        baseUrl: config.baseUrl,
      });

      let input: Record<string, unknown>;
      try {
        input = JSON.parse(options.input);
      } catch {
        error('Invalid JSON input');
        info('Example: --input \'{"prompt": "Hello!"}\'');
        process.exit(1);
      }

      try {
        info(`Running agent: ${agentId}`);

        const result = await client.agents.run({
          agent_id: agentId,
          input,
          stream: options.stream,
        });

        if (result.success) {
          success('Agent run completed');
          output(result, options.format);
        } else {
          error(`Agent run failed: ${result.error || 'Unknown error'}`);
          output(result, options.format);
          process.exit(1);
        }
      } catch (err) {
        handleError(err);
      }
    });

  return agents;
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
