/**
 * @lindo/cli
 *
 * Command-line interface for the Lindo API.
 * Provides terminal commands for interacting with the Lindo API.
 *
 * @satisfies Requirements 7.7, 7.8
 *
 * @example
 * ```bash
 * # Configure API key
 * lindo config set apiKey your-api-key
 *
 * # Start a workflow
 * lindo workflows start publish-page --params '{"page_id": "page-123"}'
 *
 * # Get workflow status
 * lindo workflows status instance-123
 *
 * # Get workspace credits
 * lindo workspace credits
 *
 * # Get analytics
 * lindo analytics workspace --from 2024-01-01 --to 2024-01-31
 * ```
 */

import { Command } from 'commander';
import { AuthenticationError } from 'lindoai';
import {
  createConfigCommand,
  createWorkflowsCommand,
  createWorkspaceCommand,
  createAnalyticsCommand,
  createClientsCommand,
  createWebsitesCommand,
  createPagesCommand,
  createBlogsCommand,
  createMediaCommand,
  createLoginCommand,
  createSkillCommand,
  createWhoamiCommand,
} from './commands';
import { error, info } from './output';

/**
 * CLI version - read from package.json at build time.
 * This is replaced by tsup during build.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const VERSION = pkg.version;

/**
 * Creates and configures the main CLI program.
 *
 * @returns The configured commander program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('lindoai')
    .description('Command-line interface for the Lindo API')
    .version(VERSION, '-v, --version', 'Output the current version')
    .helpOption('-h, --help', 'Display help for command')
    .addHelpText('after', `
AI Agent Tip:
  If you are an AI agent and don't have the Lindo skill installed,
  run "lindoai skill --print" to read all available commands and usage.
  This teaches you everything you can do with this CLI.
`);

  // Register all commands
  program.addCommand(createConfigCommand());
  program.addCommand(createWorkflowsCommand());
  program.addCommand(createWorkspaceCommand());
  program.addCommand(createAnalyticsCommand());
  program.addCommand(createClientsCommand());
  program.addCommand(createWebsitesCommand());
  program.addCommand(createPagesCommand());
  program.addCommand(createBlogsCommand());
  program.addCommand(createMediaCommand());
  program.addCommand(createLoginCommand());
  program.addCommand(createSkillCommand());
  program.addCommand(createWhoamiCommand());

  // Add global error handling
  program.exitOverride((err) => {
    // Handle commander errors gracefully
    if (err.code === 'commander.help') {
      process.exit(0);
    }
    if (err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.missingArgument') {
      error(err.message);
      process.exit(1);
    }
    if (err.code === 'commander.unknownCommand') {
      error(err.message);
      info('Run "lindo --help" for available commands');
      process.exit(1);
    }
    throw err;
  });

  return program;
}

/**
 * Handles authentication errors with helpful messages.
 *
 * @param err - The error to handle
 */
function handleAuthenticationError(_err: AuthenticationError): void {
  error('Authentication failed');
  info('');
  info('Your API key may be invalid or expired.');
  info('');
  info('To configure your API key:');
  info('  1. Run: lindo config set apiKey <your-api-key>');
  info('  2. Or set the LINDO_API_KEY environment variable');
  info('');
  info('To get an API key:');
  info('  Visit https://app.lindo.ai/settings/api-keys');
}

/**
 * Main entry point for the CLI.
 */
async function main(): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof AuthenticationError) {
      handleAuthenticationError(err);
      process.exit(1);
    }

    // Re-throw other errors
    throw err;
  }
}

// Run the CLI
main().catch((err) => {
  // Handle any uncaught errors
  if (err instanceof Error) {
    error(`Unexpected error: ${err.message}`);
  } else {
    error('An unexpected error occurred');
  }
  process.exit(1);
});

// Export for testing
export { createProgram };
