---
name: lindoai
description: Lindo AI CLI - Command-line interface for the Lindo API
---

# Lindo AI CLI

The `lindoai` CLI provides commands for interacting with the Lindo API, including website management, page editing, blog management, and more.

## Authentication

### Login via Browser
```bash
lindoai login
```
Opens your browser to authenticate and automatically configures your API key.

Options:
- `--timeout <seconds>` - Timeout for the login flow (default: 120)
- `--no-browser` - Display the authorization URL without opening the browser

### Manual Configuration
```bash
lindoai config set apiKey <your-api-key>
```

## Website Management

### List Websites
```bash
lindoai websites list
```

### Get Website Details
```bash
lindoai websites get <website_id>
```

## Page Management

### List Pages
```bash
lindoai pages list <website_id>
```

### Get Page Details
```bash
lindoai pages get <website_id> <page_id>
```

### Live Preview Editing Workflow

1. **Start editing with live preview:**
```bash
lindoai pages edit <website_id> <page_id> --background
```
This fetches the page HTML, saves it locally, starts a preview server, and opens your browser.

Options:
- `--file <path>` - Save HTML to a specific path (default: ./page.html)
- `--background` - Run the preview server in the background

2. **Edit the HTML file** in your editor. The browser will automatically refresh when you save.

3. **Update the page** when you're done:
```bash
lindoai pages update <website_id> <page_id> --html-file ./page.html
```

4. **Stop the preview server:**
```bash
lindoai pages stop-preview
```

### Important: Global Header/Footer Limitation

**Global header and footer sections cannot be updated via the CLI.** When you edit a page locally:
- The preview shows the website's global header/footer for visual context
- Any changes you make to global sections are saved with the page only
- Changes do NOT propagate to other pages or the website settings
- To update global header/footer across all pages, use the Lindo webapp

This is by design - global sections are website-wide settings managed through the webapp.

## Blog Management

### List Blogs
```bash
lindoai blogs list <website_id>
```

### Get Blog Details
```bash
lindoai blogs get <website_id> <blog_id>
```

### Live Preview Editing Workflow

1. **Start editing with live preview:**
```bash
lindoai blogs edit <website_id> <blog_id> --background
```

Options:
- `--file <path>` - Save HTML to a specific path (default: ./blog.html)
- `--background` - Run the preview server in the background

2. **Edit the HTML file** in your editor. The browser will automatically refresh when you save.

3. **Update the blog** when you're done:
```bash
lindoai blogs update <website_id> <blog_id> --html-file ./blog.html
```

4. **Stop the preview server:**
```bash
lindoai blogs stop-preview
```

## AI Agents

### Run an Agent
```bash
lindoai agents run <agent_id> --input '{"prompt": "Hello!"}'
```

Options:
- `--input <json>` - Input data as JSON string
- `--stream` - Stream the response
- `--format <format>` - Output format (json, table)

## Workflows

### Start a Workflow
```bash
lindoai workflows start <workflow_id> --params '{"key": "value"}'
```

### Get Workflow Status
```bash
lindoai workflows status <instance_id>
```

## Workspace

### Get Workspace Credits
```bash
lindoai workspace credits
```

## Analytics

### Get Workspace Analytics
```bash
lindoai analytics workspace --from 2024-01-01 --to 2024-01-31
```

## Configuration

### View Configuration
```bash
lindoai config get apiKey
lindoai config get baseUrl
```

### Set Configuration
```bash
lindoai config set apiKey <value>
lindoai config set baseUrl <value>
```

## Tips for AI Agents

1. **Always authenticate first** using `lindoai login` or by setting the API key.
2. **Use the live preview workflow** for editing pages and blogs - it provides instant visual feedback.
3. **Run preview servers in background mode** (`--background`) to keep the terminal available.
4. **Remember to stop preview servers** when done editing with `stop-preview`.
5. **Use JSON format** (`--format json`) when you need to parse command output programmatically.

## Page Building Guidelines

### Structure Requirements

When building or editing Lindo pages, follow these structure requirements:

- **Output ONLY content HTML**: Generate only `<header>`, `<section>` elements, and `<footer>`
- **NO document wrapper tags**: Do NOT include `<!DOCTYPE html>`, `<html>`, `<head>`, or `<body>` tags
- **Unique section IDs**: Each section must have a unique id following the pattern: `_block_name_###` (e.g., `_hero_001`, `_features_002`)
- **Semantic structure**: Use proper HTML5 semantic elements for accessibility

Example structure:
```html
<header id="_header_001" class="...">
  <!-- Navigation content -->
</header>

<section id="_hero_001" class="...">
  <!-- Hero content -->
</section>

<section id="_features_002" class="...">
  <!-- Features content -->
</section>

<footer id="_footer_001" class="...">
  <!-- Footer content -->
</footer>
```

### Tailwind CSS v3.4 Usage

Lindo pages use Tailwind CSS v3.4 for styling:

- **Utility-first approach**: Use Tailwind utility classes for all styling
- **No custom CSS**: Avoid writing custom CSS; use Tailwind utilities instead
- **NO font family classes**: Do NOT use `font-sans`, `font-serif`, `font-mono`, or any `font-[family]` classes - fonts are managed by the theme system
- **Responsive design**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) for all breakpoints
- **Dark mode support**: Always include dark mode variants using the `dark:` prefix
- **Neutral shades**: Use neutral color shades for text and surfaces (e.g., `text-neutral-900 dark:text-neutral-100`)

Example:
```html
<div class="px-4 py-8 md:px-8 lg:px-16 bg-white dark:bg-neutral-900">
  <h1 class="text-3xl md:text-4xl lg:text-5xl text-neutral-900 dark:text-white">
    Welcome
  </h1>
</div>
```

### Animation System

Lindo uses a custom animation system with `data-motion` attributes for scroll-triggered animations:

**Available animation types:**
- `fade` - Simple fade in
- `fade-up` - Fade in while moving up
- `fade-down` - Fade in while moving down
- `fade-left` - Fade in while moving from left
- `fade-right` - Fade in while moving from right
- `scale` - Scale up while fading in
- `card` - Card entrance animation
- `heading` - Heading text animation
- `text` - Body text animation
- `image` - Image reveal animation
- `button` - Button entrance animation

**Usage:**
```html
<section data-motion="fade-up">
  <h2 data-motion="heading">Section Title</h2>
  <p data-motion="text">Section description text.</p>
  <img data-motion="image" src="..." alt="..." />
  <button data-motion="button">Click Me</button>
</section>
```

**Animation delays:** Use `data-motion-delay` for staggered animations:
```html
<div data-motion="fade-up" data-motion-delay="0">First item</div>
<div data-motion="fade-up" data-motion-delay="100">Second item</div>
<div data-motion="fade-up" data-motion-delay="200">Third item</div>
```

### Logo Requirements

When adding logos to pages, use the `lindo-image-logo` attribute:

**Logo types:**
- `full` - Full logo (icon + text)
- `icon` - Icon only
- `text` - Text only

**Usage:**
```html
<!-- Full logo -->
<img lindo-image-logo="full" src="https://cdn.ln-cdn.com/image/placeholder-logo-full.png" alt="Logo" class="h-8" />

<!-- Icon only -->
<img lindo-image-logo="icon" src="https://cdn.ln-cdn.com/image/placeholder-logo-icon.png" alt="Logo" class="h-8 w-8" />

<!-- Text only -->
<img lindo-image-logo="text" src="https://cdn.ln-cdn.com/image/placeholder-logo-text.png" alt="Logo" class="h-6" />
```

**Important:**
- Do NOT add text or brand names as logo alternatives
- Always use the `lindo-image-logo` attribute for logos
- The actual logo will be replaced with the website's configured logo

### Theme Guidelines

Follow these theme guidelines for consistent light and dark mode support:

**Light and Dark Mode:**
- Every element must specify both light and dark styles
- Use the `dark:` prefix for dark mode variants
- Test both modes to ensure readability and contrast

**Color Palette:**
- Use Tailwind's default color palette
- Primary colors: Use brand colors from the theme
- Text colors: `text-neutral-900 dark:text-white` for headings, `text-neutral-600 dark:text-neutral-400` for body text
- Background colors: `bg-white dark:bg-neutral-900` for main backgrounds
- Surface colors: `bg-neutral-50 dark:bg-neutral-800` for cards and elevated surfaces

**Gradients:**
- Apply gradient backgrounds where appropriate for visual interest
- Example: `bg-gradient-to-br from-blue-500 to-purple-600`

**Example with full theme support:**
```html
<section class="py-16 bg-white dark:bg-neutral-900">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl text-neutral-900 dark:text-white mb-4">
      Section Title
    </h2>
    <p class="text-neutral-600 dark:text-neutral-400 mb-8">
      Section description with proper contrast in both modes.
    </p>
    <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6">
      <p class="text-neutral-700 dark:text-neutral-300">
        Card content with elevated surface.
      </p>
    </div>
  </div>
</section>
```

### Core Rules

Follow these core rules when building pages:

1. **No font family classes**: Never use `font-sans`, `font-serif`, `font-mono`, or custom font classes. The theme system manages fonts.

2. **Responsive design is required**: All pages must be fully responsive. Use Tailwind's responsive prefixes:
   - Mobile first: Start with base styles
   - `sm:` - Small screens (640px+)
   - `md:` - Medium screens (768px+)
   - `lg:` - Large screens (1024px+)
   - `xl:` - Extra large screens (1280px+)
   - `2xl:` - 2X large screens (1536px+)

3. **Accessibility considerations**:
   - Use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
   - Include `alt` attributes on all images
   - Ensure sufficient color contrast (WCAG AA minimum)
   - Use proper heading hierarchy (h1 → h2 → h3)
   - Add `aria-label` attributes to interactive elements without visible text

4. **Image handling**:
   - Use responsive images with appropriate sizes
   - Include descriptive `alt` text
   - Use lazy loading for below-the-fold images: `loading="lazy"`

5. **Link handling**:
   - Use descriptive link text (avoid "click here")
   - External links should have `target="_blank"` and `rel="noopener noreferrer"`

6. **Container patterns**:
   - Use `container mx-auto px-4` for consistent content width
   - Apply consistent vertical padding: `py-12 md:py-16 lg:py-20`
