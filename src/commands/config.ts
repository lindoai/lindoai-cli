/**
 * Config Commands
 *
 * Commands for managing CLI configuration.
 *
 * @satisfies Requirements 7.4
 */

import { Command } from 'commander';
import { saveConfig, getConfigValue, getConfigPath, loadConfig } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Valid configuration keys.
 */
const VALID_KEYS = ['apiKey', 'baseUrl'] as const;

/**
 * Creates the config command.
 *
 * @returns The config command
 */
export function createConfigCommand(): Command {
  const config = new Command('config').description('Manage CLI configuration');

  // config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      if (!VALID_KEYS.includes(key as (typeof VALID_KEYS)[number])) {
        error(`Invalid configuration key: ${key}`);
        info(`Valid keys: ${VALID_KEYS.join(', ')}`);
        process.exit(1);
      }

      try {
        saveConfig(key, value);
        success(`Configuration saved: ${key}`);
        info(`Config file: ${getConfigPath()}`);
      } catch (err) {
        error(`Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // config get <key>
  config
    .command('get <key>')
    .description('Get a configuration value')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action((key: string, options: { format: OutputFormat }) => {
      const value = getConfigValue(key);

      if (value === undefined) {
        if (options.format === 'json') {
          output({ key, value: null }, options.format);
        } else {
          info(`Configuration key '${key}' is not set`);
        }
        return;
      }

      if (options.format === 'json') {
        output({ key, value }, options.format);
      } else {
        // Mask API key for security
        const displayValue = key === 'apiKey' ? maskApiKey(value) : value;
        console.log(`${key}: ${displayValue}`);
      }
    });

  // config list
  config
    .command('list')
    .description('List all configuration values')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action((options: { format: OutputFormat }) => {
      const resolvedConfig = loadConfig();

      const configData = {
        apiKey: resolvedConfig.apiKey ? maskApiKey(resolvedConfig.apiKey) : '(not set)',
        baseUrl: resolvedConfig.baseUrl,
        configFile: getConfigPath(),
      };

      if (options.format === 'json') {
        // For JSON output, show actual values (still masked for apiKey)
        output(
          {
            apiKey: resolvedConfig.apiKey ? maskApiKey(resolvedConfig.apiKey) : null,
            baseUrl: resolvedConfig.baseUrl,
            configFile: getConfigPath(),
          },
          options.format
        );
      } else {
        output(configData, options.format);
      }
    });

  // config path
  config
    .command('path')
    .description('Show the config file path')
    .action(() => {
      console.log(getConfigPath());
    });

  return config;
}

/**
 * Masks an API key for display.
 *
 * @param apiKey - The API key to mask
 * @returns The masked API key
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '*'.repeat(apiKey.length);
  }
  return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}
