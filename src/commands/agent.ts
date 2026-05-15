/**
 * Agent Command
 *
 * Implements AI agent integration via OpenCode.
 * Checks for OpenCode installation, installs skill file, and launches the agent.
 *
 * @satisfies Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { Command } from 'commander';
import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { success, error, info } from '../output.js';
// The skill file content is authored as real Markdown at the CLI repo root
// in `SKILL.md` so it is discoverable by agents, Context7, and GitHub's
// README-style rendering. tsup inlines it into the bundle at build time via
// the `.md` text loader (see tsup.config.ts).
import SKILL_FILE_CONTENT from '../../SKILL.md';

/**
 * The directory where OpenCode skills are stored.
 */
const OPENCODE_SKILLS_DIR = path.join(os.homedir(), '.config', 'opencode', 'skills', 'lindoai');

/**
 * The path to the skill file.
 */
const SKILL_FILE_PATH = path.join(OPENCODE_SKILLS_DIR, 'SKILL.md');

/**
 * Checks if OpenCode is installed on the system.
 *
 * Uses platform-specific commands to check for the opencode binary:
 * - Windows: `where opencode`
 * - Unix/macOS: `which opencode`
 *
 * @returns True if OpenCode is installed, false otherwise
 *
 * @satisfies Requirement 10.1
 */
export function isOpenCodeInstalled(): boolean {
  try {
    const command = process.platform === 'win32' ? 'where opencode' : 'which opencode';
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to install OpenCode globally via npm.
 *
 * Runs `npm install -g opencode-ai@latest` to install the latest version.
 *
 * @returns True if installation succeeded, false otherwise
 *
 * @satisfies Requirement 10.2
 */
export function installOpenCode(): boolean {
  try {
    info('Installing OpenCode...');
    execSync('npm install -g opencode-ai@latest', { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the skill file is installed in the OpenCode skills directory.
 *
 * Creates the directory structure if it doesn't exist and writes the
 * SKILL.md file that documents all CLI commands.
 *
 * @satisfies Requirements 10.4, 10.5
 */
export function ensureSkillInstalled(): void {
  // Create the skills directory if it doesn't exist
  if (!fs.existsSync(OPENCODE_SKILLS_DIR)) {
    fs.mkdirSync(OPENCODE_SKILLS_DIR, { recursive: true });
  }

  // Write the skill file
  fs.writeFileSync(SKILL_FILE_PATH, SKILL_FILE_CONTENT, 'utf-8');
}

/**
 * Creates the agent command.
 *
 * The agent command:
 * 1. Checks if OpenCode is installed
 * 2. Optionally installs OpenCode if --install flag is provided
 * 3. Installs the skill file to teach OpenCode about CLI commands
 * 4. Launches OpenCode with inherited stdio for direct interaction
 *
 * @returns The agent command
 *
 * @example
 * ```bash
 * # Launch the AI agent
 * lindoai agent
 *
 * # Install OpenCode if not present and launch
 * lindoai agent --install
 *
 * # Launch with a specific model
 * lindoai agent --model gpt-4
 * ```
 *
 * @satisfies Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Launch an AI agent that understands all CLI commands')
    .option('--install', 'Install OpenCode if not already installed')
    .option('--model <model>', 'Specify the model to use with OpenCode')
    .action(async (options: { install?: boolean; model?: string }) => {
      // Check if OpenCode is installed (Requirement 10.1)
      if (!isOpenCodeInstalled()) {
        if (options.install) {
          // Attempt to install OpenCode (Requirement 10.2)
          const installed = installOpenCode();
          if (!installed) {
            error('Failed to install OpenCode');
            info('Please install manually: npm install -g opencode-ai@latest');
            process.exit(1);
          }
          success('OpenCode installed successfully');
        } else {
          // Display error with installation instructions (Requirement 10.3)
          error('OpenCode is not installed');
          info('');
          info('To install OpenCode, run one of the following:');
          info('  lindoai agent --install');
          info('  npm install -g opencode-ai@latest');
          process.exit(1);
        }
      }

      // Install the skill file (Requirements 10.4, 10.5)
      try {
        ensureSkillInstalled();
        info(`Skill file installed to: ${SKILL_FILE_PATH}`);
      } catch (err) {
        error(`Failed to install skill file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        process.exit(1);
      }

      // Build the OpenCode command arguments
      const args: string[] = [];

      // Add model option if provided (Requirement 10.6)
      if (options.model) {
        args.push('--model', options.model);
      }

      // Launch OpenCode with inherited stdio (Requirement 10.7)
      info('Launching OpenCode...');
      
      const opencode = spawn('opencode', args, {
        stdio: 'inherit',
        shell: true,
      });

      opencode.on('error', (err) => {
        error(`Failed to launch OpenCode: ${err.message}`);
        process.exit(1);
      });

      opencode.on('close', (code) => {
        process.exit(code ?? 0);
      });
    });

  return agent;
}
