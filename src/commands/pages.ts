/**
 * Pages Commands
 *
 * Commands for page management operations.
 *
 * @satisfies Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';
import { openBrowser } from '../utils/browser';
import { generateGoogleFontsHtml } from '../utils/fonts';
import { extractGlobalSections, injectGlobalSections } from '../utils/global-sections';
import { processLocalAssets } from '../utils/local-assets';
import { extractHtmlData } from '../utils/html-extraction';

/**
 * PID file path for the pages preview server.
 * Located in the OS temp directory.
 */
const PID_FILE = path.join(os.tmpdir(), 'lindoai-pages-preview.pid');

/**
 * Port file path for the pages preview server.
 * Located in the OS temp directory.
 */
const PORT_FILE = path.join(os.tmpdir(), 'lindoai-pages-preview.port');

/**
 * Creates the pages command.
 *
 * @returns The pages command
 */
export function createPagesCommand(): Command {
  const pages = new Command('pages').description('Page management operations');

  // pages list
  pages
    .command('list')
    .description('List all pages for a website')
    .requiredOption('-w, --website <id>', 'Website ID')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-s, --search <search>', 'Search term')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; page: string; search?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.pages.list(options.website, {
          page: parseInt(options.page, 10),
          search: options.search,
        });
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          const result = response.result;
          if (result?.list && result.list.length > 0) {
            console.log('\nPages:');
            console.log('------');
            for (const p of result.list) {
              console.log(`  ID: ${p.page_id}`);
              console.log(`  Name: ${p.name ?? 'N/A'}`);
              console.log(`  Path: ${p.path ?? 'N/A'}`);
              console.log(`  Status: ${p.status ?? 'N/A'}`);
              console.log(`  Published: ${p.publish_date ? 'Yes' : 'No'}`);
              console.log('');
            }
            console.log(`Total: ${result.total ?? result.list.length}`);
          } else {
            info('No pages found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages get
  pages
    .command('get')
    .description('Get details of a specific page')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Page ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.pages.get(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          const result = response.result;
          if (result) {
            console.log('\nPage Details:');
            console.log('-------------');
            console.log(`  ID: ${result.page_id}`);
            console.log(`  Name: ${result.name ?? 'N/A'}`);
            console.log(`  Path: ${result.path ?? 'N/A'}`);
            console.log(`  Status: ${result.status ?? 'N/A'}`);
            console.log(`  Published: ${result.publish_date ? 'Yes' : 'No'}`);
            console.log(`  Created: ${result.created_date ?? 'N/A'}`);
          } else {
            error('Page not found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages publish - removed, use 'pages update --html-file' instead
  // The API requires HTML content to publish, so a simple publish command doesn't make sense

  // pages unpublish
  pages
    .command('unpublish')
    .description('Unpublish a page')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Page ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.pages.unpublish(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Page unpublished successfully');
            console.log(`  Page ID: ${response.result?.page_id}`);
          } else {
            error('Failed to unpublish page');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages delete
  pages
    .command('delete')
    .description('Delete a page')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Page ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.pages.deletePage(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Page deleted successfully');
            console.log(`  Page ID: ${response.result?.page_id}`);
            if (response.result?.warnings && response.result.warnings.length > 0) {
              console.log('  Warnings:');
              for (const w of response.result.warnings) {
                console.log(`    - ${w}`);
              }
            }
          } else {
            error('Failed to delete page');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages create-empty
  // Creates a new page with a starter template and opens it for editing
  // Requirements 4.5, 5.5: Fetch and include existing global header/footer from website
  pages
    .command('create-empty')
    .description('Create a new empty page with starter template and live preview')
    .argument('<website_id>', 'Website ID')
    .argument('<path>', 'URL path for the page (e.g., /about-us)')
    .option('--title <title>', 'Page title', 'New Page')
    .option('--file <path>', 'Output file path', './page.html')
    .option('--background', 'Run preview server in background')
    .action(async (websiteId: string, pagePath: string, options: { title: string; file: string; background?: boolean }) => {
      const client = getClient();

      try {
        // Fetch website details for theme settings and global sections
        // Requirements 4.5, 5.5: Fetch website theme settings and global header/footer
        info('Fetching website details...');
        const websiteResponse = await client.websites.getDetails(websiteId);
        
        // Extract website details (with fallbacks if not available)
        // Note: Using type assertion as the SDK types will be updated to include these fields
        const websiteResult = websiteResponse.result as {
          theme?: Record<string, unknown>;
          global_header?: string | null;
          global_footer?: string | null;
          custom_codes?: { header?: string | null; footer?: string | null };
        };
        const websiteTheme = websiteResult?.theme || {};
        const websiteGlobalHeader = websiteResult?.global_header || null;
        const websiteGlobalFooter = websiteResult?.global_footer || null;
        const websiteCustomCodes = websiteResult?.custom_codes || { header: null, footer: null };

        // Extract font settings from website theme for use in preview HTML generation
        const websiteFonts = {
          font: websiteTheme.font as string | undefined,
          title_font: websiteTheme.title_font as string | undefined,
        };

        // Build starter HTML template
        const pageTitle = options.title;
        
        // Create starter HTML content (just the main content, not full page)
        const starterHtml = `<!-- Hero Section -->
<section class="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-6">
      ${pageTitle}
    </h1>
    <p class="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-2xl mx-auto">
      Start building your page by editing this template. Add sections, customize styles, and create something amazing.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#features" class="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition">
        Get Started
      </a>
      <a href="#contact" class="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
        Learn More
      </a>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="py-20 bg-white dark:bg-neutral-900">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
        Features
      </h2>
      <p class="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
        Discover what makes us different.
      </p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Feature One</h3>
        <p class="text-neutral-600 dark:text-neutral-300">Description of your first amazing feature goes here.</p>
      </div>
      <div class="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Feature Two</h3>
        <p class="text-neutral-600 dark:text-neutral-300">Description of your second amazing feature goes here.</p>
      </div>
      <div class="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
        <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Feature Three</h3>
        <p class="text-neutral-600 dark:text-neutral-300">Description of your third amazing feature goes here.</p>
      </div>
    </div>
  </div>
</section>

<!-- Contact Section -->
<section id="contact" class="py-20 bg-neutral-50 dark:bg-neutral-800">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
      Get in Touch
    </h2>
    <p class="text-lg text-neutral-600 dark:text-neutral-300 mb-8">
      Have questions? We'd love to hear from you.
    </p>
    <a href="mailto:hello@example.com" class="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition text-lg">
      Contact Us
    </a>
  </div>
</section>`;

        // Default settings for new page
        const settings = {
          theme: {
            mode: 'Dark',
            direction: 'ltr',
            main_classes: 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100',
            animations_deactivated: false,
          },
          should_convert: true,
        };

        // Default SEO for new page
        const seo = {
          page_title: pageTitle,
          meta_description: '',
          social_title: pageTitle,
          social_description: '',
          noindex: false,
          nofollow: false,
        };

        // Create the page via API
        info('Creating page...');
        const createResponse = await client.pages.create(websiteId, {
          html: starterHtml,
          path: pagePath,
          settings: settings,
          template_name: pageTitle,
          seo: seo,
        });

        if (!createResponse.success) {
          error('Failed to create page');
          process.exit(1);
        }

        const pageId = createResponse.result.page_id;
        const publishedUrl = (createResponse.result as any).published_url;
        success(`Page created: ${pageId}`);
        if (publishedUrl) {
          console.log(`  Published URL: ${publishedUrl}`);
        }

        // Generate Google Fonts HTML from website theme settings
        const googleFontsHtml = generateGoogleFontsHtml(websiteFonts);

        // Inject global header/footer into main content
        // Requirements 4.5, 5.5: Include existing global header/footer from website
        const mainContentWithGlobalSections = injectGlobalSections(
          starterHtml,
          websiteGlobalHeader ?? undefined,
          websiteGlobalFooter ?? undefined
        );

        // Get effective custom codes from website settings
        const effectiveCustomCodes = {
          header: websiteCustomCodes.header || '',
          footer: websiteCustomCodes.footer || '',
        };

        // Build full HTML page for local editing (like edit command does)
        const fullHtml = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <title>${pageTitle}</title>
    <meta name="description" content="">

    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="">
    <meta property="og:type" content="website">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="">

    <!-- Google Fonts -->
    ${googleFontsHtml}

    <!-- Tailwind CSS v4 CDN for preview -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

    <!-- Motion for animations -->
    <script src="https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js"></script>
    <script src="https://lnui.pages.dev/motion-animate.js"></script>

    <!-- Page Custom Code (Header) -->
    ${effectiveCustomCodes.header}
    <!-- End Page Custom Code (Header) -->

</head>
<body>
    <!-- ========== MAIN CONTENT ========== -->
    <main dir="ltr" lindo-main-content id="content" role="main" class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">

${mainContentWithGlobalSections}

    </main>
    <!-- ========== END MAIN CONTENT ========== -->

    <!-- Config script -->
    <script src="https://cdn.ln-cdn.com/staging/js/config2.js"></script>

    <!-- Page Custom Code (Footer) -->
    ${effectiveCustomCodes.footer}
    <!-- End Page Custom Code (Footer) -->
</body>
</html>`;

        // Save HTML to local file
        const outputPath = path.resolve(options.file);
        fs.writeFileSync(outputPath, fullHtml, 'utf-8');
        success(`HTML saved to ${outputPath}`);

        // Terminate any existing preview server
        await terminateExistingPreviewServer();

        if (options.background) {
          await startBackgroundPreviewServer(outputPath);
        } else {
          await startForegroundPreviewServer(outputPath);
        }

        // Show update command
        console.log('');
        info(`To save changes: lindoai pages update ${websiteId} ${pageId} --html-file ${options.file}`);
      } catch (err) {
        handleError(err);
      }
    });

  // pages edit
  // Requirement 6.1: Fetch page HTML and save to local file
  // Requirement 6.2: --file option for custom output path
  // Requirement 6.3: --background flag for detached preview server
  // Requirement 6.4: Start preview server and open browser
  // Requirements 1.1, 4.1, 5.1: Fetch website details for theme settings and global sections
  pages
    .command('edit')
    .description('Edit a page with live preview')
    .argument('<website_id>', 'Website ID')
    .argument('<page_id>', 'Page ID')
    .option('--file <path>', 'Output file path', './page.html')
    .option('--background', 'Run preview server in background')
    .action(async (websiteId: string, pageId: string, options: { file: string; background?: boolean }) => {
      const client = getClient();

      try {
        // Fetch page HTML from API (blocks_html for agentic pages)
        info('Fetching page HTML...');
        const htmlResponse = await client.pages.getHtml(websiteId, pageId);
        
        if (!htmlResponse.result) {
          error('Page not found');
          process.exit(1);
        }

        const blocksHtml = htmlResponse.result.html;
        
        if (!blocksHtml) {
          error('Page has no HTML content');
          info('Make sure the page has been created with HTML content');
          process.exit(1);
        }

        // Fetch website details for theme settings and global sections
        // Requirements 1.1, 4.1, 5.1: Fetch website theme settings and global header/footer
        info('Fetching website details...');
        const websiteResponse = await client.websites.getDetails(websiteId);
        
        // Extract website details (with fallbacks if not available)
        // Note: Using type assertion as the SDK types will be updated to include these fields
        const websiteResult = websiteResponse.result as {
          theme?: Record<string, unknown>;
          global_header?: string | null;
          global_footer?: string | null;
          custom_codes?: { header?: string | null; footer?: string | null };
        };
        const websiteTheme = websiteResult?.theme || {};
        // TODO (Task 4.3): Use websiteGlobalHeader and websiteGlobalFooter for global section injection
        const websiteGlobalHeader = websiteResult?.global_header || null;
        const websiteGlobalFooter = websiteResult?.global_footer || null;
        const websiteCustomCodes = websiteResult?.custom_codes || { header: null, footer: null };

        // Build full HTML page like publisher_new.ts does
        const pageName = htmlResponse.result.name || 'Page';
        const seo = htmlResponse.result.seo || {};
        const settings = htmlResponse.result.settings || {};
        // Use page-level custom codes if available, otherwise fall back to website-level
        const customCodes = htmlResponse.result.custom_codes || {};
        const effectiveCustomCodes = {
          header: customCodes.header || websiteCustomCodes.header || '',
          footer: customCodes.footer || websiteCustomCodes.footer || '',
        };
        const theme = settings.theme || {};
        
        const isDark = theme.mode !== 'Light';
        const direction = theme.direction || 'ltr';
        const mainClasses = theme.main_classes || '';
        const animationsDeactivated = theme.animations_deactivated || false;

        // Extract font settings - prioritize page-level theme over website-level theme
        // Requirements 1.2, 1.3, 1.4: Generate Google Fonts HTML for preview
        const effectiveFonts = {
          font: (theme.font as string | undefined) || (websiteTheme.font as string | undefined),
          title_font: (theme.title_font as string | undefined) || (websiteTheme.title_font as string | undefined),
        };
        const googleFontsHtml = generateGoogleFontsHtml(effectiveFonts);
        
        // First, extract and remove any existing global sections from the page HTML
        // This prevents duplicate global sections when the page was previously saved with them
        const existingGlobalSections = extractGlobalSections(blocksHtml);
        const cleanBlocksHtml = existingGlobalSections.mainContent;
        
        // Requirements 4.2, 5.2: Inject global header/footer into main content
        // Use injectGlobalSections to combine clean blocksHtml with website's global header and footer
        const mainContentWithGlobalSections = injectGlobalSections(
          cleanBlocksHtml,
          websiteGlobalHeader ?? undefined,
          websiteGlobalFooter ?? undefined
        );

        // Build HTML matching publisher_new.ts output
        const fullHtml = `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}" lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1 ${seo.noindex ? 'noindex' : ''} ${seo.nofollow ? 'nofollow' : ''}">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <title>${seo.page_title || pageName}</title>
    <meta name="description" content="${seo.meta_description || ''}">

    <meta property="og:title" content="${seo.social_title || seo.page_title || pageName}">
    <meta property="og:description" content="${seo.social_description || seo.meta_description || ''}">
    ${seo.social_image ? `<meta property="og:image" content="${seo.social_image}">` : ''}
    <meta property="og:type" content="website">
    ${seo.canonical_url ? `<meta property="og:url" content="${seo.canonical_url}">` : ''}

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seo.social_title || seo.page_title || pageName}">
    <meta name="twitter:description" content="${seo.social_description || seo.meta_description || ''}">
    ${seo.social_image ? `<meta name="twitter:image" content="${seo.social_image}">` : ''}

    <!-- Google Fonts -->
    ${googleFontsHtml}

    <!-- Tailwind CSS v4 CDN for preview -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

    ${!animationsDeactivated ? `
    <!-- Motion for animations -->
    <script src="https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js"></script>
    <script src="https://lnui.pages.dev/motion-animate.js"></script>
    ` : ''}

    ${seo.canonical_url ? `<link rel="canonical" href="${seo.canonical_url}">` : ''}

    <!-- Page Custom Code (Header) -->
    ${effectiveCustomCodes.header}
    <!-- End Page Custom Code (Header) -->

</head>
<body>
    <!-- ========== MAIN CONTENT ========== -->
    <main dir="${direction}" lindo-main-content id="content" role="main" class="${mainClasses}">

${mainContentWithGlobalSections}

    </main>
    <!-- ========== END MAIN CONTENT ========== -->

    <!-- Config script -->
    <script src="https://cdn.ln-cdn.com/staging/js/config2.js"></script>

    <!-- Page Custom Code (Footer) -->
    ${effectiveCustomCodes.footer}
    <!-- End Page Custom Code (Footer) -->
</body>
</html>`;

        // Save HTML to local file
        // Requirement 6.1, 6.2: Save to specified path or default ./page.html
        const outputPath = path.resolve(options.file);
        fs.writeFileSync(outputPath, fullHtml, 'utf-8');
        success(`HTML saved to ${outputPath}`);

        // Terminate any existing preview server
        // Requirement 9.6: Terminate existing server before starting new one
        await terminateExistingPreviewServer();

        if (options.background) {
          // Requirement 6.3, 9.1: Spawn detached preview server
          await startBackgroundPreviewServer(outputPath);
        } else {
          // Start preview server in foreground
          await startForegroundPreviewServer(outputPath);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages update
  // Requirement 6.5: Update page from local HTML file
  // Note: Global header/footer sections are extracted but only saved with the page,
  // not propagated to website-level settings. Use the webapp to update global sections.
  pages
    .command('update')
    .description('Update a page from HTML file (note: global header/footer changes are page-specific only)')
    .argument('<website_id>', 'Website ID')
    .argument('<page_id>', 'Page ID')
    .option('--html-file <path>', 'Path to local HTML file to upload')
    .option('--upload-assets', 'Upload local images/assets to CDN before publishing')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, pageId: string, options: { htmlFile?: string; uploadAssets?: boolean; format: OutputFormat }) => {
      const client = getClient();

      try {
        if (!options.htmlFile) {
          error('--html-file option is required');
          info('Usage: lindoai pages update <website_id> <page_id> --html-file <path>');
          process.exit(1);
        }

        // Read the local HTML file
        const htmlPath = path.resolve(options.htmlFile);
        if (!fs.existsSync(htmlPath)) {
          error(`File not found: ${htmlPath}`);
          process.exit(1);
        }

        let fullHtml = fs.readFileSync(htmlPath, 'utf-8');
        info(`Read ${fullHtml.length} bytes from ${htmlPath}`);

        // Process local assets if --upload-assets flag is set
        if (options.uploadAssets) {
          const basePath = path.dirname(htmlPath);
          info('Processing local assets...');
          
          const assetsResult = await processLocalAssets(
            fullHtml,
            basePath,
            websiteId,
            client,
            (msg) => info(msg),
            htmlPath // Pass source file path to update it with CDN URLs
          );
          
          if (assetsResult.uploadedCount > 0) {
            fullHtml = assetsResult.html;
            success(`Uploaded ${assetsResult.uploadedCount} asset(s) to CDN`);
            if (assetsResult.failedCount > 0) {
              info(`Warning: ${assetsResult.failedCount} asset(s) failed to upload`);
            }
            if (assetsResult.sourceFileUpdated) {
              info('Source file updated with CDN URLs (prevents duplicate uploads)');
            }
          }
        }

        // Use shared extraction utility
        const extracted = extractHtmlData(fullHtml);
        
        if (extracted.globalHeader) {
          info('Detected global header section');
        }
        if (extracted.globalFooter) {
          info('Detected global footer section');
        }
        if (extracted.templateName) {
          info(`Extracted page title: ${extracted.templateName}`);
        }
        if (extracted.headerCode) {
          info('Extracted header custom code');
        }
        if (extracted.footerCode) {
          info('Extracted footer custom code');
        }
        if (Object.keys(extracted.seo).length > 2) { // More than just noindex/nofollow
          info('Extracted SEO metadata');
        }

        // Get the current page to get its path and merge settings
        const pageResponse = await client.pages.get(websiteId, pageId);
        if (!pageResponse.result) {
          error('Page not found');
          process.exit(1);
        }

        const pagePath = pageResponse.result.path;

        // Build settings object, merging with existing page settings
        const settings = {
          ...(pageResponse.result.settings || {}),
          theme: {
            ...((pageResponse.result.settings as any)?.theme || {}),
            ...extracted.settings.theme,
          },
          should_convert: true,
        };

        // Update the page via SDK
        info('Updating page...');
        
        // Note: Using type assertion as the SDK types will be updated to include global_header/global_footer
        const response = await client.pages.publish(websiteId, pageId, {
          html: extracted.html,
          path: pagePath,
          settings: settings,
          template_name: extracted.templateName,
          custom_codes: extracted.customCodes,
          seo: Object.keys(extracted.seo).length > 0 ? extracted.seo : undefined,
          // Requirements 4.4, 5.4: Include extracted global sections in API call
          global_header: extracted.globalHeader,
          global_footer: extracted.globalFooter,
        } as Parameters<typeof client.pages.publish>[2]);

        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Page updated successfully');
            console.log(`  Page ID: ${response.result?.page_id}`);
            if ((response.result as any)?.published_url) {
              console.log(`  Published URL: ${(response.result as any).published_url}`);
            }
          } else {
            error('Failed to update page');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // pages stop-preview
  // Requirement 6.6, 9.4, 9.5: Stop background preview server
  pages
    .command('stop-preview')
    .description('Stop the background preview server')
    .action(async () => {
      try {
        // Check if PID file exists
        // Requirement 9.5: Display message if no preview server is running
        if (!fs.existsSync(PID_FILE)) {
          info('No preview server is running');
          return;
        }

        // Read PID from file
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
        
        if (isNaN(pid)) {
          error('Invalid PID file');
          cleanupPidFiles();
          return;
        }

        // Send SIGTERM to the process
        // Requirement 9.4: Send SIGTERM to stop the server
        try {
          process.kill(pid, 'SIGTERM');
          success(`Preview server (PID ${pid}) stopped`);
        } catch (killErr: any) {
          if (killErr.code === 'ESRCH') {
            info('Preview server process not found (may have already stopped)');
          } else {
            error(`Failed to stop preview server: ${killErr.message}`);
          }
        }

        // Clean up PID and port files
        cleanupPidFiles();
      } catch (err) {
        if (err instanceof Error) {
          error(err.message);
        } else {
          error('An unexpected error occurred');
        }
        process.exit(1);
      }
    });

  // pages create-with-content
  // Create pages from HTML files in a local folder, uploading local assets to CDN
  // Uses shared extractHtmlData utility for consistency with 'pages update'
  pages
    .command('create-with-content')
    .description('Create pages from HTML files in a local folder with automatic asset upload')
    .argument('<website_id>', 'Website ID')
    .argument('<folder>', 'Path to folder containing HTML files')
    .option('--path-prefix <prefix>', 'URL path prefix for pages (e.g., /blog)', '')
    .option('--dry-run', 'Show what would be created without actually creating')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, folder: string, options: { pathPrefix: string; dryRun?: boolean; format: OutputFormat }) => {
      const client = getClient();

      try {
        const folderPath = path.resolve(folder);
        if (!fs.existsSync(folderPath)) {
          error(`Folder not found: ${folderPath}`);
          process.exit(1);
        }

        const stat = fs.statSync(folderPath);
        if (!stat.isDirectory()) {
          error(`Not a directory: ${folderPath}`);
          process.exit(1);
        }

        // Find all HTML files in the folder (non-recursive for now)
        const files = fs.readdirSync(folderPath);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        if (htmlFiles.length === 0) {
          error('No HTML files found in folder');
          process.exit(1);
        }

        info(`Found ${htmlFiles.length} HTML file(s) to create`);

        if (options.dryRun) {
          console.log('\nDry run - would create:');
          for (const file of htmlFiles) {
            const pagePath = file === 'index.html' 
              ? (options.pathPrefix || '/') 
              : `${options.pathPrefix}/${file.replace('.html', '')}`;
            console.log(`  ${file} → ${pagePath}`);
          }
          return;
        }

        const results: { file: string; pageId?: string; success: boolean; error?: string }[] = [];

        for (const file of htmlFiles) {
          const htmlPath = path.join(folderPath, file);
          let fullHtml = fs.readFileSync(htmlPath, 'utf-8');
          
          info(`\nProcessing: ${file}`);

          // Process local assets
          info('Uploading local assets...');
          const assetsResult = await processLocalAssets(
            fullHtml,
            folderPath,
            websiteId,
            client,
            (msg) => info(`  ${msg}`)
          );
          
          if (assetsResult.uploadedCount > 0) {
            fullHtml = assetsResult.html;
            success(`  Uploaded ${assetsResult.uploadedCount} asset(s)`);
          }

          // Use shared extraction utility
          const extracted = extractHtmlData(fullHtml, file.replace('.html', ''));

          // Log extraction details (same as update command)
          if (extracted.globalHeader) {
            info('  Detected global header section');
          }
          if (extracted.globalFooter) {
            info('  Detected global footer section');
          }
          if (extracted.templateName) {
            info(`  Extracted page title: ${extracted.templateName}`);
          }
          if (extracted.headerCode) {
            info('  Extracted header custom code');
          }
          if (extracted.footerCode) {
            info('  Extracted footer custom code');
          }
          if (Object.keys(extracted.seo).length > 2) { // More than just noindex/nofollow
            info('  Extracted SEO metadata');
          }

          // Determine page path
          const pagePath = file === 'index.html' 
            ? (options.pathPrefix || '/') 
            : `${options.pathPrefix}/${file.replace('.html', '')}`;

          // Create the page with all extracted data
          try {
            info(`  Creating page at ${pagePath}...`);
            const response = await client.pages.create(websiteId, {
              html: extracted.html,
              path: pagePath,
              template_name: extracted.templateName,
              seo: Object.keys(extracted.seo).length > 0 ? extracted.seo : undefined,
              settings: extracted.settings,
              custom_codes: extracted.customCodes,
              global_header: extracted.globalHeader,
              global_footer: extracted.globalFooter,
            } as Parameters<typeof client.pages.create>[1]);

            if (response.success) {
              const publishedUrl = (response.result as any).published_url;
              success(`  Created: ${file} → ${pagePath} (${response.result.page_id})`);
              if (publishedUrl) {
                console.log(`    URL: ${publishedUrl}`);
              }
              results.push({ file, pageId: response.result.page_id, success: true });
            } else {
              error(`  Failed to create: ${file}`);
              results.push({ file, success: false, error: 'API returned failure' });
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            error(`  Failed to create: ${file} - ${errMsg}`);
            results.push({ file, success: false, error: errMsg });
          }
        }

        // Summary
        console.log('\n--- Summary ---');
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (options.format === 'json') {
          output({ results, successCount, failCount }, 'json');
        } else {
          console.log(`Created: ${successCount}/${results.length} pages`);
          if (failCount > 0) {
            console.log(`Failed: ${failCount} pages`);
            for (const r of results.filter(r => !r.success)) {
              console.log(`  - ${r.file}: ${r.error}`);
            }
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  return pages;
}

/**
 * Gets a configured LindoClient.
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

/**
 * Cleans up PID and port files.
 */
function cleanupPidFiles(): void {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {
    // Ignore errors when cleaning up
  }

  try {
    if (fs.existsSync(PORT_FILE)) {
      fs.unlinkSync(PORT_FILE);
    }
  } catch {
    // Ignore errors when cleaning up
  }
}

/**
 * Terminates any existing preview server.
 * Requirement 9.6: Terminate existing server before starting new one
 */
async function terminateExistingPreviewServer(): Promise<void> {
  if (!fs.existsSync(PID_FILE)) {
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    if (!isNaN(pid)) {
      try {
        process.kill(pid, 'SIGTERM');
        info(`Terminated existing preview server (PID ${pid})`);
        // Wait a bit for the process to terminate
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Process may not exist, ignore
      }
    }
  } catch {
    // Ignore errors reading PID file
  }

  cleanupPidFiles();
}

/**
 * Starts the preview server in background mode.
 * Requirements 6.3, 9.1, 9.2, 9.3: Spawn detached process, write PID/port files
 */
async function startBackgroundPreviewServer(filePath: string): Promise<void> {
  const absolutePath = path.resolve(filePath);
  
  // Inline server code that will be executed in the child process
  // This is necessary because we need to spawn a completely detached process
  const serverCode = `
    const http = require('node:http');
    const fs = require('node:fs');
    const path = require('node:path');
    const os = require('node:os');

    const LIVE_RELOAD_SCRIPT = \`<script>
    (function() {
      var eventSource = new EventSource('/__live-reload');
      eventSource.onmessage = function(event) {
        if (event.data === 'reload') {
          window.location.reload();
        }
      };
      eventSource.onerror = function() {
        console.log('[Live Reload] Connection lost, attempting to reconnect...');
      };
    })();
    </script>\`;

    const filePath = ${JSON.stringify(absolutePath)};
    const pidFile = path.join(os.tmpdir(), 'lindoai-pages-preview.pid');
    const portFile = path.join(os.tmpdir(), 'lindoai-pages-preview.port');
    const sseClients = new Set();
    let debounceTimer = null;

    function injectLiveReload(html) {
      const bodyCloseTagRegex = /<\\/body>/i;
      const match = html.match(bodyCloseTagRegex);
      if (match && match.index !== undefined) {
        return html.slice(0, match.index) + LIVE_RELOAD_SCRIPT + html.slice(match.index);
      }
      return html + LIVE_RELOAD_SCRIPT;
    }

    function notifyClients() {
      for (const client of sseClients) {
        try {
          client.write('data: reload\\n\\n');
        } catch {
          sseClients.delete(client);
        }
      }
    }

    function handleFileChange() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        notifyClients();
        debounceTimer = null;
      }, 100);
    }

    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }

      if (url === '/__live-reload') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write('data: connected\\n\\n');
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      if (url === '/' || url === '/index.html') {
        try {
          const html = fs.readFileSync(filePath, 'utf-8');
          const injectedHtml = injectLiveReload(html);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(injectedHtml);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Error loading file</h1><p>' + err.message + '</p>');
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
    });

    let watcher = null;

    const handleShutdown = () => {
      if (watcher) watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const client of sseClients) {
        try { client.end(); } catch {}
      }
      sseClients.clear();
      try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch {}
      try { if (fs.existsSync(portFile)) fs.unlinkSync(portFile); } catch {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      fs.writeFileSync(pidFile, process.pid.toString(), 'utf-8');
      fs.writeFileSync(portFile, port.toString(), 'utf-8');
      
      try {
        watcher = fs.watch(filePath, (eventType) => {
          if (eventType === 'change') handleFileChange();
        });
      } catch {}
    });
  `;

  // Spawn the server as a detached process
  const child = spawn(process.execPath, ['-e', serverCode], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  // Wait for the port file to be written
  let port: number | null = null;
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (fs.existsSync(PORT_FILE)) {
      try {
        port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8').trim(), 10);
        if (!isNaN(port)) break;
      } catch {
        // Continue waiting
      }
    }
  }

  if (!port) {
    error('Failed to start preview server');
    process.exit(1);
  }

  const previewUrl = `http://127.0.0.1:${port}/`;
  
  // Open browser
  // Requirement 6.4: Open browser to preview URL
  const browserOpened = await openBrowser(previewUrl);
  if (!browserOpened) {
    info(`Could not open browser. Visit: ${previewUrl}`);
  }

  success('Preview server started in background');
  console.log(`  URL: ${previewUrl}`);
  console.log(`  PID: ${child.pid}`);
  console.log('');
  info('To update the page: lindoai pages update <website_id> <page_id> --html-file <path>');
  info('To stop the server: lindoai pages stop-preview');
}

/**
 * Starts the preview server in foreground mode.
 * Requirement 6.4: Start preview server and open browser
 */
async function startForegroundPreviewServer(filePath: string): Promise<void> {
  // Import the live preview server
  const { startLivePreviewServer } = await import('../server/live-preview-server');
  
  info('Starting preview server...');
  const port = await startLivePreviewServer(filePath);
  const previewUrl = `http://127.0.0.1:${port}/`;

  // Write PID and port files for consistency
  fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf-8');
  fs.writeFileSync(PORT_FILE, port.toString(), 'utf-8');

  // Open browser
  const browserOpened = await openBrowser(previewUrl);
  if (!browserOpened) {
    info(`Could not open browser. Visit: ${previewUrl}`);
  }

  success('Preview server started');
  console.log(`  URL: ${previewUrl}`);
  console.log('');
  info('Press Ctrl+C to stop the server');
  info('Edit the HTML file and save to see changes in the browser');
}
