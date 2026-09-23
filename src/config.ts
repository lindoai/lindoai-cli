/**
 * CLI Configuration Management
 *
 * Handles loading and saving CLI configuration.
 * Environment variables take precedence over config file values.
 *
 * @satisfies Requirements 7.3
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Environment variable name for the API key.
 */
export const ENV_API_KEY = 'LINDO_API_KEY';

/**
 * Environment variable name for the base URL.
 */
export const ENV_BASE_URL = 'LINDO_BASE_URL';

/**
 * Default config directory name.
 */
const CONFIG_DIR = '.lindo';

/**
 * Default config file name.
 */
const CONFIG_FILE = 'config.json';

/**
 * Default base URL for the Lindo API.
 */
const DEFAULT_BASE_URL = 'https://api.lindo.ai';

/**
 * Configuration values stored in the config file.
 */
export interface ConfigFile {
  /** API key for authentication */
  apiKey?: string;

  /** Base URL for API requests */
  baseUrl?: string;
}

/**
 * Resolved configuration with all values.
 */
export interface ResolvedConfig {
  /** API key for authentication (may be undefined if not configured) */
  apiKey?: string;

  /** Base URL for API requests */
  baseUrl: string;
}

/**
 * Gets the path to the config directory.
 *
 * @returns The absolute path to the config directory
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR);
}

/**
 * Gets the path to the config file.
 *
 * @returns The absolute path to the config file
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE);
}

/**
 * Reads the config file from disk.
 *
 * @returns The parsed config file contents, or empty object if file doesn't exist
 */
export function readConfigFile(): ConfigFile {
  const configPath = getConfigPath();

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as ConfigFile;
    }
  } catch {
    // If file is corrupted or unreadable, return empty config
  }

  return {};
}

/**
 * Writes the config file to disk.
 *
 * @param config - The configuration to write
 */
export function writeConfigFile(config: ConfigFile): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Loads configuration with environment variable precedence.
 *
 * Priority order (highest to lowest):
 * 1. Environment variables (LINDO_API_KEY, LINDO_BASE_URL)
 * 2. Config file (~/.lindo/config.json)
 * 3. Default values
 *
 * @returns The resolved configuration
 */
export function loadConfig(): ResolvedConfig {
  const fileConfig = readConfigFile();

  // Environment variables take precedence over config file
  const apiKey = process.env[ENV_API_KEY] || fileConfig.apiKey;
  const baseUrl = process.env[ENV_BASE_URL] || fileConfig.baseUrl || DEFAULT_BASE_URL;

  return {
    apiKey,
    baseUrl,
  };
}

/**
 * Saves the API key to the config file.
 *
 * @param apiKey - The API key to save
 */
export function saveApiKey(apiKey: string): void {
  const config = readConfigFile();
  config.apiKey = apiKey;
  writeConfigFile(config);
}

/**
 * Saves the base URL to the config file.
 *
 * @param baseUrl - The base URL to save
 */
export function saveBaseUrl(baseUrl: string): void {
  const config = readConfigFile();
  config.baseUrl = baseUrl;
  writeConfigFile(config);
}

/**
 * Saves a configuration value by key.
 *
 * @param key - The configuration key ('apiKey' or 'baseUrl')
 * @param value - The value to save
 * @throws Error if the key is not recognized
 */
export function saveConfig(key: string, value: string): void {
  const config = readConfigFile();

  switch (key) {
    case 'apiKey':
      config.apiKey = value;
      break;
    case 'baseUrl':
      config.baseUrl = value;
      break;
    default:
      throw new Error(`Unknown configuration key: ${key}`);
  }

  writeConfigFile(config);
}

/**
 * Gets a configuration value by key.
 *
 * @param key - The configuration key ('apiKey' or 'baseUrl')
 * @returns The configuration value, or undefined if not set
 */
export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();

  switch (key) {
    case 'apiKey':
      return config.apiKey;
    case 'baseUrl':
      return config.baseUrl;
    default:
      return undefined;
  }
}

/**
 * Checks if the API key is configured.
 *
 * @returns True if an API key is available
 */
export function hasApiKey(): boolean {
  const config = loadConfig();
  return !!config.apiKey;
}
