/**
 * CLI Output Utilities
 *
 * Provides formatting utilities for CLI output.
 * Supports JSON and table output formats.
 *
 * @satisfies Requirements 7.5
 */

/**
 * Output format options.
 */
export type OutputFormat = 'json' | 'table';

/**
 * ANSI color codes for terminal output.
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

/**
 * Checks if colors should be used in output.
 *
 * @returns True if colors should be used
 */
function useColors(): boolean {
  // Disable colors if NO_COLOR is set or stdout is not a TTY
  return !process.env.NO_COLOR && process.stdout.isTTY !== false;
}

/**
 * Applies color to text if colors are enabled.
 *
 * @param text - The text to colorize
 * @param color - The color code to apply
 * @returns The colorized text
 */
function colorize(text: string, color: string): string {
  if (!useColors()) {
    return text;
  }
  return `${color}${text}${colors.reset}`;
}

/**
 * Prints a success message to stdout.
 *
 * @param message - The message to print
 */
export function success(message: string): void {
  console.log(colorize(`✓ ${message}`, colors.green));
}

/**
 * Prints an error message to stderr.
 *
 * @param message - The message to print
 */
export function error(message: string): void {
  console.error(colorize(`✗ ${message}`, colors.red));
}

/**
 * Prints a warning message to stderr.
 *
 * @param message - The message to print
 */
export function warn(message: string): void {
  console.warn(colorize(`⚠ ${message}`, colors.yellow));
}

/**
 * Prints an info message to stdout.
 *
 * @param message - The message to print
 */
export function info(message: string): void {
  console.log(colorize(`ℹ ${message}`, colors.blue));
}

/**
 * Formats data as JSON.
 *
 * @param data - The data to format
 * @returns The JSON string
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Formats data as a table.
 *
 * @param data - The data to format (object or array of objects)
 * @returns The formatted table string
 */
export function formatTable(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No data';
    }

    // Get all unique keys from all objects
    const keys = new Set<string>();
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach((key) => keys.add(key));
      }
    }

    if (keys.size === 0) {
      // Array of primitives
      return data.map((item) => String(item)).join('\n');
    }

    const columns = Array.from(keys);
    return formatTableFromRows(columns, data);
  }

  // Handle single object
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return 'No data';
    }

    // Format as key-value pairs
    const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
    return entries
      .map(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLength);
        const formattedValue = formatValue(value);
        return `${colorize(paddedKey, colors.cyan)}  ${formattedValue}`;
      })
      .join('\n');
  }

  // Handle primitives
  return String(data);
}

/**
 * Formats a table from rows of data.
 *
 * @param columns - The column headers
 * @param rows - The data rows
 * @returns The formatted table string
 */
function formatTableFromRows(columns: string[], rows: unknown[]): string {
  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
  }

  for (const row of rows) {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>;
      for (const col of columns) {
        const value = formatValue(obj[col]);
        widths[col] = Math.max(widths[col], value.length);
      }
    }
  }

  // Build header
  const header = columns.map((col) => colorize(col.padEnd(widths[col]), colors.bold)).join('  ');

  // Build separator
  const separator = columns.map((col) => '-'.repeat(widths[col])).join('  ');

  // Build rows
  const dataRows = rows.map((row) => {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>;
      return columns.map((col) => formatValue(obj[col]).padEnd(widths[col])).join('  ');
    }
    return String(row);
  });

  return [header, separator, ...dataRows].join('\n');
}

/**
 * Formats a single value for display.
 *
 * @param value - The value to format
 * @returns The formatted string
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return colorize('-', colors.gray);
  }

  if (typeof value === 'boolean') {
    return value ? colorize('true', colors.green) : colorize('false', colors.red);
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Outputs data in the specified format.
 *
 * @param data - The data to output
 * @param format - The output format ('json' or 'table')
 */
export function output(data: unknown, format: OutputFormat): void {
  if (format === 'json') {
    console.log(formatJson(data));
  } else {
    console.log(formatTable(data));
  }
}

/**
 * Prints a blank line.
 */
export function newline(): void {
  console.log();
}

/**
 * Prints a header.
 *
 * @param text - The header text
 */
export function header(text: string): void {
  console.log(colorize(text, colors.bold));
}
