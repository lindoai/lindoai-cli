/**
 * Skill Command
 *
 * Installs the Lindo AI skill file (SKILL.md) to all supported terminal-based
 * AI agent skill directories so they can learn all available CLI commands.
 *
 * Supported agents:
 * - Claude Code: ~/.claude/skills/lindoai/SKILL.md
 * - OpenCode:    ~/.config/opencode/skills/lindoai/SKILL.md
 * - Codex:       ~/.codex/skills/lindoai/SKILL.md
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { success, error, info } from '../output.js';
import SKILL_FILE_CONTENT from '../../SKILL.md';

const SKILL_NAME = 'lindoai';
const SKILL_FILE = 'SKILL.md';

/**
 * Standard skill directories for supported agents.
 */
function getSkillPaths(): { agent: string; dir: string }[] {
  const home = os.homedir();
  return [
    { agent: 'Claude Code', dir: path.join(home, '.claude', 'skills', SKILL_NAME) },
    { agent: 'OpenCode', dir: path.join(home, '.config', 'opencode', 'skills', SKILL_NAME) },
    { agent: 'Codex', dir: path.join(home, '.codex', 'skills', SKILL_NAME) },
  ];
}

/**
 * Creates the skill command.
 *
 * @example
 * ```bash
 * # Install the skill to all supported agents
 * lindoai skill
 *
 * # Install to a specific custom directory only
 * lindoai skill --dir ~/.my-agent/skills
 *
 * # Print the skill content to stdout (for piping)
 * lindoai skill --print
 * ```
 */
export function createSkillCommand(): Command {
  const skill = new Command('skill')
    .description('Install the Lindo AI skill for Claude Code, OpenCode, and Codex')
    .option('--dir <path>', 'Install to a custom directory only (skips standard locations)')
    .option('--print', 'Print the skill content to stdout instead of writing files')
    .action(async (options: { dir?: string; print?: boolean }) => {
      // --print mode: output skill content for piping
      if (options.print) {
        process.stdout.write(SKILL_FILE_CONTENT);
        return;
      }

      // --dir mode: install to a single custom location
      if (options.dir) {
        const skillFilePath = path.join(options.dir, SKILL_FILE);
        try {
          fs.mkdirSync(options.dir, { recursive: true });
          fs.writeFileSync(skillFilePath, SKILL_FILE_CONTENT, 'utf-8');
          success(`Skill installed: ${skillFilePath}`);
        } catch (err) {
          error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          process.exit(1);
        }
        return;
      }

      // Default: install to all standard agent locations
      const paths = getSkillPaths();
      let installed = 0;

      for (const { agent, dir } of paths) {
        const skillFilePath = path.join(dir, SKILL_FILE);
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(skillFilePath, SKILL_FILE_CONTENT, 'utf-8');
          info(`  ✓ ${agent}: ${skillFilePath}`);
          installed++;
        } catch {
          info(`  ✗ ${agent}: failed (permission denied or path unavailable)`);
        }
      }

      if (installed > 0) {
        success(`\nSkill installed for ${installed} agent${installed > 1 ? 's' : ''}.`);
        info('Any of these agents can now use all Lindo CLI commands.');
      } else {
        error('Failed to install skill to any location.');
        info('Try: lindoai skill --dir <path>');
        process.exit(1);
      }
    });

  return skill;
}
