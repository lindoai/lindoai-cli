# @lindo/cli

Command-line interface for the Lindo API. Interact with AI agents, workflows, workspace management, and analytics from your terminal.

## Installation

```bash
npm install -g @lindo/cli
# or
yarn global add @lindo/cli
# or
pnpm add -g @lindo/cli
```

## Quick Start

```bash
# Configure your API key
lindo config set apiKey your-api-key

# Run an agent
lindo agents run my-agent --input '{"prompt": "Hello!"}'

# Start a workflow
lindo workflows start publish-page --params '{"page_id": "page-123"}'

# Get workflow status
lindo workflows status instance-123

# Get workspace credits
lindo workspace credits

# Get analytics
lindo analytics workspace --from 2024-01-01 --to 2024-01-31
```

## Configuration

The CLI supports configuration via environment variables and a config file.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LINDO_API_KEY` | Your Lindo API key |
| `LINDO_BASE_URL` | API base URL (default: https://api.lindo.ai) |

### Config File

Configuration is stored in `~/.lindo/config.json`.

```bash
# Set API key
lindo config set apiKey your-api-key

# Set custom base URL
lindo config set baseUrl https://custom-api.example.com

# Get a config value
lindo config get apiKey

# List all config values
lindo config list

# Show config file path
lindo config path
```

### Configuration Precedence

1. Environment variables (highest priority)
2. Config file (`~/.lindo/config.json`)
3. Default values (lowest priority)

## Command Reference

### Global Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Output the current version |
| `-h, --help` | Display help for command |

### `lindo config`

Manage CLI configuration.

```bash
# Set a configuration value
lindo config set <key> <value>

# Get a configuration value
lindo config get <key>

# List all configuration values
lindo config list

# Show config file path
lindo config path
```

**Valid configuration keys:** `apiKey`, `baseUrl`

### `lindo agents`

Run AI agents.

```bash
# Run an agent
lindo agents run <agent-id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <json>` | Input data as JSON string | `{}` |
| `-s, --stream` | Stream the response | `false` |
| `-f, --format <format>` | Output format (`json`, `table`) | `table` |

**Examples:**

```bash
# Run an agent with input
lindo agents run my-agent --input '{"prompt": "Hello!"}'

# Run with streaming
lindo agents run my-agent --input '{"prompt": "Hello!"}' --stream

# Output as JSON
lindo agents run my-agent --input '{"prompt": "Hello!"}' --format json
```

### `lindo workflows`

Manage workflows.

```bash
# Start a workflow
lindo workflows start <workflow-name> [options]

# Get workflow status
lindo workflows status <instance-id> [options]

# Pause a workflow
lindo workflows pause <instance-id> [options]

# Resume a workflow
lindo workflows resume <instance-id> [options]

# Terminate a workflow
lindo workflows terminate <instance-id> [options]
```

**Options for `start`:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --params <json>` | Workflow parameters as JSON string | `{}` |
| `-f, --format <format>` | Output format (`json`, `table`) | `table` |

**Options for other commands:**

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format (`json`, `table`) | `table` |

**Examples:**

```bash
# Start a workflow
lindo workflows start publish-page --params '{"page_id": "page-123"}'

# Get workflow status
lindo workflows status instance-123

# Pause a running workflow
lindo workflows pause instance-123

# Resume a paused workflow
lindo workflows resume instance-123

# Terminate a workflow
lindo workflows terminate instance-123

# Output as JSON
lindo workflows status instance-123 --format json
```

### `lindo workspace`

Workspace operations.

```bash
# Get credit balance
lindo workspace credits [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format (`json`, `table`) | `table` |

**Examples:**

```bash
# Get credits in table format
lindo workspace credits

# Get credits as JSON
lindo workspace credits --format json
```

### `lindo analytics`

Analytics operations.

```bash
# Get workspace analytics
lindo analytics workspace [options]

# Get website analytics
lindo analytics website [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--from <date>` | Start date (ISO format) | - |
| `--to <date>` | End date (ISO format) | - |
| `-f, --format <format>` | Output format (`json`, `table`) | `table` |

**Examples:**

```bash
# Get workspace analytics
lindo analytics workspace

# Get analytics for a date range
lindo analytics workspace --from 2024-01-01 --to 2024-01-31

# Get website analytics as JSON
lindo analytics website --format json
```

## Output Formats

The CLI supports two output formats:

### Table Format (default)

Human-readable formatted output:

```
┌─────────────┬────────────┐
│ workspace_id│ ws-123     │
│ balance     │ 1000       │
│ allocated   │ 5000       │
│ used        │ 4000       │
└─────────────┴────────────┘
```

### JSON Format

Machine-readable JSON output:

```json
{
  "workspace_id": "ws-123",
  "balance": 1000,
  "allocated": 5000,
  "used": 4000
}
```

Use `--format json` for scripting and automation.

## Error Handling

The CLI provides helpful error messages:

```bash
$ lindo agents run my-agent
✗ API key not configured
ℹ Run: lindo config set apiKey <your-api-key>
ℹ Or set the LINDO_API_KEY environment variable
```

### Authentication Errors

If authentication fails, the CLI will prompt you to configure your API key:

```bash
✗ Authentication failed
ℹ Your API key may be invalid or expired.
ℹ
ℹ To configure your API key:
ℹ   1. Run: lindo config set apiKey <your-api-key>
ℹ   2. Or set the LINDO_API_KEY environment variable
ℹ
ℹ To get an API key:
ℹ   Visit https://app.lindo.ai/settings/api-keys
```

## Development

```bash
# Build the CLI
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

## License

MIT
