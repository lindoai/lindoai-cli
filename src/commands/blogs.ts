/**
 * Blogs Commands
 *
 * Commands for blog management operations.
 *
 * @satisfies Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { Command } from 'commander';
import { LindoClient, AuthenticationError } from 'lindoai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { marked } from 'marked';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';
import { openBrowser } from '../utils/browser';
import { generateGoogleFontsHtml } from '../utils/fonts';

/**
 * PID file path for the blogs preview server.
 * Located in the OS temp directory.
 */
const PID_FILE = path.join(os.tmpdir(), 'lindoai-blogs-preview.pid');

/**
 * Port file path for the blogs preview server.
 * Located in the OS temp directory.
 */
const PORT_FILE = path.join(os.tmpdir(), 'lindoai-blogs-preview.port');

/**
 * Creates the blogs command.
 *
 * @returns The blogs command
 */
export function createBlogsCommand(): Command {
  const blogs = new Command('blogs').description('Blog management operations');

  // blogs list
  blogs
    .command('list')
    .description('List all blogs for a website')
    .requiredOption('-w, --website <id>', 'Website ID')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-s, --search <search>', 'Search term')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; page: string; search?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.blogs.list(options.website, {
          page: parseInt(options.page, 10),
          search: options.search,
        });
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          const result = response.result;
          if (result?.list && result.list.length > 0) {
            console.log('\nBlogs:');
            console.log('------');
            for (const b of result.list) {
              console.log(`  ID: ${b.blog_id}`);
              console.log(`  Name: ${b.name ?? 'N/A'}`);
              console.log(`  Path: ${b.path ?? 'N/A'}`);
              console.log(`  Status: ${b.status ?? 'N/A'}`);
              console.log(`  Published: ${b.publish_date ? new Date(b.publish_date * 1000).toISOString() : 'No'}`);
              console.log('');
            }
            console.log(`Total: ${result.total ?? result.list.length}`);
          } else {
            info('No blogs found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs get
  blogs
    .command('get')
    .description('Get details of a specific blog')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Blog ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.blogs.get(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          const result = response.result;
          if (result) {
            console.log('\nBlog Details:');
            console.log('-------------');
            console.log(`  ID: ${result.blog_id}`);
            console.log(`  Name: ${result.name ?? 'N/A'}`);
            console.log(`  Path: ${result.path ?? 'N/A'}`);
            console.log(`  Status: ${result.status ?? 'N/A'}`);
            console.log(`  Published: ${result.publish_date ? new Date(result.publish_date * 1000).toISOString() : 'No'}`);
            console.log(`  Created: ${result.created_date ?? 'N/A'}`);
          } else {
            error('Blog not found');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs publish
  blogs
    .command('publish')
    .description('Publish a blog')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Blog ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.blogs.publish(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Blog published successfully');
            console.log(`  Blog ID: ${response.result?.blog_id}`);
            console.log(`  Published at: ${response.result?.publish_date ? new Date(response.result.publish_date * 1000).toISOString() : 'N/A'}`);
            if ((response.result as any)?.published_url) {
              console.log(`  Published URL: ${(response.result as any).published_url}`);
            }
          } else {
            error('Failed to publish blog');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs unpublish
  blogs
    .command('unpublish')
    .description('Unpublish a blog')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Blog ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.blogs.unpublish(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Blog unpublished successfully');
            console.log(`  Blog ID: ${response.result?.blog_id}`);
          } else {
            error('Failed to unpublish blog');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs delete
  blogs
    .command('delete')
    .description('Delete a blog')
    .requiredOption('-w, --website <id>', 'Website ID')
    .requiredOption('-i, --id <id>', 'Blog ID')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (options: { website: string; id: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const response = await client.blogs.delete(options.website, options.id);
        
        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Blog deleted successfully');
            console.log(`  Blog ID: ${response.result?.blog_id}`);
            if (response.result?.warnings && response.result.warnings.length > 0) {
              console.log('  Warnings:');
              for (const w of response.result.warnings) {
                console.log(`    - ${w}`);
              }
            }
          } else {
            error('Failed to delete blog');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs edit
  // Requirement 7.1: Fetch blog HTML and save to local file
  // Requirement 7.2: --file option for custom output path
  // Requirement 7.3: --background flag for detached preview server
  // Requirement 7.4: Start preview server and open browser
  blogs
    .command('edit')
    .description('Edit a blog with live preview')
    .argument('<website_id>', 'Website ID')
    .argument('<blog_id>', 'Blog ID')
    .option('--file <path>', 'Output file path', './blog.html')
    .option('--background', 'Run preview server in background')
    .action(async (websiteId: string, blogId: string, options: { file: string; background?: boolean }) => {
      const client = getClient();

      try {
        // Fetch blog content from R2 via getHtml endpoint
        info('Fetching blog content...');
        const blogResponse = await client.blogs.getHtml(websiteId, blogId);
        
        if (!blogResponse.result) {
          error('Blog not found');
          process.exit(1);
        }

        const blog = blogResponse.result;
        
        // Get website details for business name and theme settings
        // Requirement 2.1: Fetch website theme settings including font configuration
        const websiteResponse = await client.websites.getDetails(websiteId);
        if (!websiteResponse.result) {
          error('Website not found');
          process.exit(1);
        }
        const website = websiteResponse.result;

        // Extract website theme settings for fonts
        // Note: Using type assertion as the SDK types will be updated to include these fields
        const websiteResult = website as {
          business_name?: string;
          theme?: Record<string, unknown>;
          custom_codes?: { header?: string | null; footer?: string | null };
        };
        const websiteTheme = websiteResult?.theme || {};
        const websiteCustomCodes = websiteResult?.custom_codes || { header: null, footer: null };

        // Extract font settings from website theme
        const websiteFonts = {
          font: websiteTheme.font as string | undefined,
          title_font: websiteTheme.title_font as string | undefined,
        };

        // Extract blog data from getHtml response
        const seo = blog.seo || {};
        const blogSettings = blog.blog_settings || {};
        const blogContent = blog.blog_content || '<p>Start writing your blog content here...</p>';

        // Generate blog HTML template matching generateBlogHtml from publisher_new.ts
        // Requirements 2.2, 2.3: Include Google Fonts in blog preview
        // Requirements 3.3, 3.4: Include custom codes in blog preview
        const fullHtml = generateBlogPreviewHtml({
          seo,
          blogSettings,
          blogContent,
          websiteName: website.business_name || 'Blog',
          blogPath: websiteTheme.blog_path as string || 'blog',
          websiteTheme: websiteFonts,
          customCodes: {
            header: websiteCustomCodes.header || undefined,
            footer: websiteCustomCodes.footer || undefined,
          },
        });

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
        info(`To save changes: lindoai blogs update ${websiteId} ${blogId} --html-file ${options.file}`);
      } catch (err) {
        handleError(err);
      }
    });

  // blogs update
  // Update and publish a blog from Markdown or HTML content
  blogs
    .command('update')
    .description(`Update and publish a blog post.

Content can be provided as Markdown (--md-file) or raw HTML (--html-file).
Markdown files support frontmatter for metadata, but CLI flags always take priority.
All metadata fields are required — the command will fail if any are missing.

Examples:
  # Update from Markdown with frontmatter (metadata in frontmatter)
  lindoai blogs update <website_id> <blog_id> --md-file post.md

  # Update from Markdown with CLI flags
  lindoai blogs update <website_id> <blog_id> --md-file post.md \\
    --title "My Post" --author "Jane" --excerpt "Summary here" \\
    --social-image "https://cdn.ln-cdn.com/c/site/images/hero.jpg"

  # Update from HTML content file
  lindoai blogs update <website_id> <blog_id> --html-file content.html \\
    --title "My Post" --author "Jane" --excerpt "Summary" \\
    --social-image "https://cdn.ln-cdn.com/c/site/images/hero.jpg"

Markdown frontmatter format:
  ---
  title: My Blog Post
  description: Meta description for SEO
  image: https://cdn.ln-cdn.com/c/site/images/hero.jpg
  author: Jane Doe
  excerpt: A short summary shown in blog listings
  category: Tech
  date: January 15, 2025
  ---
  Your markdown content here...`)
    .argument('<website_id>', 'Website ID')
    .argument('<blog_id>', 'Blog ID')
    .option('--md-file <path>', 'Path to Markdown file (converted to HTML before publishing)')
    .option('--html-file <path>', 'Path to HTML file (used as blog_content directly)')
    .option('--title <title>', 'Blog title (SEO page_title) [required]')
    .option('--description <text>', 'Meta description for SEO')
    .option('--excerpt <text>', 'Blog excerpt/summary shown in blog listings [required]')
    .option('--social-image <url>', 'Social image URL for og:image/twitter:image (full URL) [required]')
    .option('--author <name>', 'Author name [required]')
    .option('--category <name>', 'Blog category [required]')
    .option('--date <date>', 'Publish date (e.g. "January 15, 2025")')
    .option('--read-time <time>', 'Read time (e.g. "5 min read")')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, blogId: string, options: { mdFile?: string; htmlFile?: string; title?: string; description?: string; excerpt?: string; socialImage?: string; author?: string; category?: string; date?: string; readTime?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        if (!options.mdFile && !options.htmlFile) {
          error('Either --md-file or --html-file is required');
          info('Usage: lindoai blogs update <website_id> <blog_id> --md-file <path> [options]');
          process.exit(1);
        }

        let blogContent: string;
        let seo: any = {};
        let blogSettings: any = {};

        if (options.mdFile) {
          const mdPath = path.resolve(options.mdFile);
          if (!fs.existsSync(mdPath)) {
            error(`File not found: ${mdPath}`);
            process.exit(1);
          }
          const markdown = fs.readFileSync(mdPath, 'utf-8');
          info(`Read ${markdown.length} bytes from ${mdPath}`);

          const { content, frontmatter } = parseMarkdownFrontmatter(markdown);
          blogContent = convertMarkdownToHtml(content);

          // Extract metadata from frontmatter
          if (frontmatter.title) seo.page_title = frontmatter.title;
          if (frontmatter.description) seo.meta_description = frontmatter.description;
          if (frontmatter.image) seo.social_image = frontmatter.image;
          if (frontmatter.author) blogSettings.author = frontmatter.author;
          if (frontmatter.excerpt) blogSettings.excerpt = frontmatter.excerpt;
          if (frontmatter.category) blogSettings.category = frontmatter.category;
          if (frontmatter.date) blogSettings.publish_date = frontmatter.date;
        } else {
          const htmlPath = path.resolve(options.htmlFile!);
          if (!fs.existsSync(htmlPath)) {
            error(`File not found: ${htmlPath}`);
            process.exit(1);
          }
          blogContent = fs.readFileSync(htmlPath, 'utf-8');
          info(`Read ${blogContent.length} bytes from ${htmlPath}`);
        }

        // CLI flags override frontmatter values
        if (options.title) seo.page_title = options.title;
        if (options.description) seo.meta_description = options.description;
        if (options.socialImage) seo.social_image = options.socialImage;
        if (options.author) blogSettings.author = options.author;
        if (options.excerpt) blogSettings.excerpt = options.excerpt;
        if (options.category) blogSettings.category = options.category;
        if (options.date) blogSettings.publish_date = options.date;
        if (options.readTime) blogSettings.read_time = options.readTime;

        // Get the current blog to get its path and fill in any missing values
        const blogResponse = await client.blogs.get(websiteId, blogId);
        if (!blogResponse.result) {
          error('Blog not found');
          process.exit(1);
        }

        const existingBlog = blogResponse.result;
        const blogPath = existingBlog.path;

        // Merge: CLI flags > frontmatter > existing blog values
        const mergedSeo = {
          page_title: seo.page_title || (existingBlog.seo as any)?.page_title,
          meta_description: seo.meta_description || (existingBlog.seo as any)?.meta_description,
          social_title: seo.page_title || (existingBlog.seo as any)?.social_title,
          social_description: seo.meta_description || (existingBlog.seo as any)?.social_description,
          social_image: seo.social_image || (existingBlog.seo as any)?.social_image,
        };

        const mergedBlogSettings = {
          author: blogSettings.author || (existingBlog.blog_settings as any)?.author,
          excerpt: blogSettings.excerpt || (existingBlog.blog_settings as any)?.excerpt,
          category: blogSettings.category || (existingBlog.blog_settings as any)?.category,
          publish_date: blogSettings.publish_date || (existingBlog.blog_settings as any)?.publish_date,
          read_time: blogSettings.read_time || (existingBlog.blog_settings as any)?.read_time,
          author_image: blogSettings.author_image || (existingBlog.blog_settings as any)?.author_image,
        };

        // Validate required fields
        const missing: string[] = [];
        if (!mergedSeo.page_title) missing.push('--title');
        if (!mergedSeo.social_image) missing.push('--social-image');
        if (!mergedBlogSettings.author) missing.push('--author');
        if (!mergedBlogSettings.excerpt) missing.push('--excerpt');
        if (!mergedBlogSettings.category) missing.push('--category');
        if (missing.length > 0) {
          error(`Missing required fields: ${missing.join(', ')}`);
          info('These can be set via CLI flags or Markdown frontmatter.');
          info('If the blog already has these values, they will be preserved.');
          process.exit(1);
        }

        info('Updating blog...');

        const response = await client.blogs.publish(websiteId, blogId, {
          path: blogPath,
          blog_content: blogContent,
          seo: mergedSeo,
          blog_settings: mergedBlogSettings,
        });

        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Blog updated successfully');
            console.log(`  Blog ID: ${response.result?.blog_id}`);
            if ((response.result as any)?.published_url) {
              console.log(`  Published URL: ${(response.result as any).published_url}`);
            }
          } else {
            error('Failed to update blog');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs create
  // Create a new blog post from Markdown or HTML content
  blogs
    .command('create')
    .description(`Create and publish a new blog post.

Content can be provided as Markdown (--md-file) or raw HTML (--html-file).
Markdown is converted to HTML before publishing. Frontmatter is supported for metadata.
All metadata fields are required — the command will fail if any are missing.

Examples:
  # Create from Markdown with all metadata in frontmatter
  lindoai blogs create <website_id> /blog/my-post --md-file post.md

  # Create from Markdown with CLI flags
  lindoai blogs create <website_id> /blog/my-post --md-file post.md \\
    --title "My Post" --author "Jane" --excerpt "Summary" \\
    --social-image "https://cdn.ln-cdn.com/c/site/images/hero.jpg" \\
    --category "Tech"

  # Create from HTML content
  lindoai blogs create <website_id> /blog/my-post --html-file content.html \\
    --title "My Post" --author "Jane" --excerpt "Summary" \\
    --social-image "https://cdn.ln-cdn.com/c/site/images/hero.jpg" \\
    --category "Tech"

Markdown frontmatter format:
  ---
  title: My Blog Post
  description: Meta description for SEO
  image: https://cdn.ln-cdn.com/c/site/images/hero.jpg
  author: Jane Doe
  excerpt: A short summary shown in blog listings
  category: Tech
  date: January 15, 2025
  ---
  Your markdown content here...`)
    .argument('<website_id>', 'Website ID')
    .argument('<path>', 'URL path for the blog (e.g., /blog/my-first-post)')
    .option('--md-file <path>', 'Path to Markdown file (converted to HTML before publishing)')
    .option('--html-file <path>', 'Path to HTML file (used as blog_content directly)')
    .option('--title <title>', 'Blog title (SEO page_title) [required]')
    .option('--description <text>', 'Meta description for SEO')
    .option('--excerpt <text>', 'Blog excerpt/summary shown in blog listings [required]')
    .option('--social-image <url>', 'Social image URL for og:image/twitter:image (full URL) [required]')
    .option('--author <name>', 'Author name [required]')
    .option('--category <name>', 'Blog category [required]')
    .option('--date <date>', 'Publish date (e.g. "January 15, 2025")')
    .option('--read-time <time>', 'Read time (e.g. "5 min read")')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, blogPath: string, options: { mdFile?: string; htmlFile?: string; title?: string; description?: string; excerpt?: string; socialImage?: string; author?: string; category?: string; date?: string; readTime?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        if (!options.mdFile && !options.htmlFile) {
          error('Either --md-file or --html-file is required');
          info('Usage: lindoai blogs create <website_id> <path> --md-file <path> [options]');
          process.exit(1);
        }

        let blogContent: string;
        let seo: any = {};
        let blogSettings: any = {};

        if (options.mdFile) {
          const mdPath = path.resolve(options.mdFile);
          if (!fs.existsSync(mdPath)) {
            error(`File not found: ${mdPath}`);
            process.exit(1);
          }
          const markdown = fs.readFileSync(mdPath, 'utf-8');
          info(`Read ${markdown.length} bytes from ${mdPath}`);

          const { content, frontmatter } = parseMarkdownFrontmatter(markdown);
          blogContent = convertMarkdownToHtml(content);

          if (frontmatter.title) seo.page_title = frontmatter.title;
          if (frontmatter.description) seo.meta_description = frontmatter.description;
          if (frontmatter.image) seo.social_image = frontmatter.image;
          if (frontmatter.author) blogSettings.author = frontmatter.author;
          if (frontmatter.excerpt) blogSettings.excerpt = frontmatter.excerpt;
          if (frontmatter.category) blogSettings.category = frontmatter.category;
          if (frontmatter.date) blogSettings.publish_date = frontmatter.date;
        } else {
          const htmlPath = path.resolve(options.htmlFile!);
          if (!fs.existsSync(htmlPath)) {
            error(`File not found: ${htmlPath}`);
            process.exit(1);
          }
          blogContent = fs.readFileSync(htmlPath, 'utf-8');
          info(`Read ${blogContent.length} bytes from ${htmlPath}`);
        }

        // CLI flags override frontmatter values
        if (options.title) seo.page_title = options.title;
        if (options.description) seo.meta_description = options.description;
        if (options.socialImage) seo.social_image = options.socialImage;
        if (options.author) blogSettings.author = options.author;
        if (options.excerpt) blogSettings.excerpt = options.excerpt;
        if (options.category) blogSettings.category = options.category;
        if (options.date) blogSettings.publish_date = options.date;
        if (options.readTime) blogSettings.read_time = options.readTime;

        // Default publish date to today if not provided
        if (!blogSettings.publish_date) {
          blogSettings.publish_date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        // Validate required fields
        const missing: string[] = [];
        if (!seo.page_title) missing.push('--title');
        if (!seo.social_image) missing.push('--social-image');
        if (!blogSettings.author) missing.push('--author');
        if (!blogSettings.excerpt) missing.push('--excerpt');
        if (!blogSettings.category) missing.push('--category');
        if (missing.length > 0) {
          error(`Missing required fields: ${missing.join(', ')}`);
          info('Set these via CLI flags or Markdown frontmatter.');
          process.exit(1);
        }

        const finalSeo = {
          page_title: seo.page_title,
          meta_description: seo.meta_description || seo.page_title,
          social_title: seo.page_title,
          social_description: seo.meta_description || seo.page_title,
          social_image: seo.social_image,
        };

        const finalBlogSettings = {
          author: blogSettings.author,
          excerpt: blogSettings.excerpt,
          category: blogSettings.category,
          publish_date: blogSettings.publish_date,
          read_time: blogSettings.read_time,
        };

        info('Creating blog...');

        const response = await client.blogs.create(websiteId, {
          path: blogPath,
          blog_content: blogContent,
          seo: finalSeo,
          blog_settings: finalBlogSettings,
        });

        if (options.format === 'json') {
          output(response, 'json');
        } else {
          if (response.success) {
            success('Blog created successfully');
            console.log(`  Blog ID: ${response.result?.blog_id}`);
            if ((response.result as any)?.published_url) {
              console.log(`  Published URL: ${(response.result as any).published_url}`);
            }
          } else {
            error('Failed to create blog');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // blogs stop-preview
  // Requirement 7.6, 9.4, 9.5: Stop background preview server
  blogs
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

  return blogs;
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
 * Requirements 7.3, 9.1, 9.2, 9.3: Spawn detached process, write PID/port files
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
    const pidFile = path.join(os.tmpdir(), 'lindoai-blogs-preview.pid');
    const portFile = path.join(os.tmpdir(), 'lindoai-blogs-preview.port');
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
  // Requirement 7.4: Open browser to preview URL
  const browserOpened = await openBrowser(previewUrl);
  if (!browserOpened) {
    info(`Could not open browser. Visit: ${previewUrl}`);
  }

  success('Preview server started in background');
  console.log(`  URL: ${previewUrl}`);
  console.log(`  PID: ${child.pid}`);
  console.log('');
  info('To update the blog: lindoai blogs update <website_id> <blog_id> --html-file <path>');
  info('To stop the server: lindoai blogs stop-preview');
}

/**
 * Starts the preview server in foreground mode.
 * Requirement 7.4: Start preview server and open browser
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

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 */
function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Generate blog preview HTML matching generateBlogHtml from publisher_new.ts
 * Requirements 2.2, 2.3: Include Google Fonts in blog preview
 * Requirements 3.3, 3.4: Include custom codes in blog preview
 */
function generateBlogPreviewHtml(options: {
  seo: any;
  blogSettings: any;
  blogContent: string;
  websiteName: string;
  blogPath: string;
  websiteTheme?: { font?: string; title_font?: string };
  customCodes?: { header?: string; footer?: string };
}): string {
  const { seo, blogSettings, blogContent, websiteName, blogPath, websiteTheme, customCodes } = options;
  
  // Generate Google Fonts HTML from website theme settings
  // Requirements 2.2, 2.3: Include Google Fonts preconnect and stylesheet links
  const googleFontsHtml = websiteTheme ? generateGoogleFontsHtml(websiteTheme) : '';
  
  return `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    
    <title>${seo.page_title || 'Blog Post'}</title>
    <meta name="description" content="${seo.meta_description || ''}">
    
    <meta property="og:title" content="${seo.social_title || seo.page_title || ''}">
    <meta property="og:description" content="${seo.social_description || seo.meta_description || ''}">
    ${seo.social_image ? `<meta property="og:image" content="${seo.social_image}">` : ''}
    <meta property="og:type" content="article">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seo.social_title || seo.page_title || ''}">
    <meta name="twitter:description" content="${seo.social_description || seo.meta_description || ''}">
    ${seo.social_image ? `<meta name="twitter:image" content="${seo.social_image}">` : ''}

    <!-- Google Fonts -->
    ${googleFontsHtml}

    <!-- Tailwind CSS v4 CDN for preview -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

    <!-- Custom Code (Header) -->
    ${customCodes?.header || ''}

    <style>
        /* Required default styles for content */
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: revert;
        }
        menu, ol, ul {
            list-style: revert;
            margin: revert;
            padding: revert;
        }
        /* Reading progress bar */
        #reading-progress {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            z-index: 1000;
            transition: width 0.25s ease;
        }
        /* Custom scrollbar for dark mode */
        .dark ::-webkit-scrollbar { width: 8px; }
        .dark ::-webkit-scrollbar-track { background: #1f2937; }
        .dark ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
        .dark ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
    </style>
</head>
<body>
<div class="bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 font-sans antialiased min-h-screen">
    <!-- Reading Progress Bar -->
    <div id="reading-progress"></div>

    <!-- Navigation -->
    <nav class="fixed w-full top-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-b border-gray-200 dark:border-neutral-800">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-2">
                    <a href="/${blogPath}" class="flex items-center space-x-2 text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                    </a>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="copyLink()" class="text-gray-500 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                    <button onclick="toggleTheme()" class="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all hover:scale-110">
                        <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                        </svg>
                        <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Article Header -->
    <header class="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <article class="max-w-4xl mx-auto">
            ${blogSettings.category ? `
            <div class="mb-6">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    ${blogSettings.category}
                </span>
            </div>
            ` : ''}

            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight mb-6 text-gray-900 dark:text-neutral-100">
                ${seo.page_title || 'Untitled'}
            </h1>

            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-neutral-400 mb-8">
                <div class="flex items-center space-x-2">
                    <div id="blog-author-avatar" class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        ${getInitials(blogSettings.author || 'Anonymous')}
                    </div>
                    <span id="blog-author-display" class="font-medium text-neutral-200">
                        ${blogSettings.author || 'Anonymous'}
                    </span>
                </div>
                <span>•</span>
                <time>${blogSettings.publish_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <span>•</span>
                <span>${blogSettings.read_time || '4 min read'}</span>
            </div>

            ${seo.social_image ? `
            <div class="aspect-video rounded-xl overflow-hidden mb-8">
                <img src="${seo.social_image}" alt="" class="w-full h-full object-cover">
            </div>
            ` : ''}

            ${blogSettings.excerpt ? `
            <div class="text-xl text-gray-700 dark:text-neutral-300 leading-relaxed mb-8 italic border-l-4 border-blue-500 pl-6">
                ${blogSettings.excerpt}
            </div>
            ` : ''}
        </article>
    </header>

    <!-- Article Content -->
    <main class="px-4 sm:px-6 lg:px-8 pb-16">
        <article class="max-w-3xl mx-auto prose prose-lg prose-gray dark:prose-invert">
            ${blogContent}
        </article>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 py-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
            <p class="text-gray-600 dark:text-neutral-400">&copy; ${new Date().getFullYear()}. ${websiteName}.</p>
        </div>
    </footer>
</div>

<script>
    function toggleTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || !savedTheme) {
            document.documentElement.classList.add('dark');
        }
    });
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        document.getElementById('reading-progress').style.width = scrollPercent + '%';
    });
    function copyLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        });
    }
</script>

<!-- Config script -->
<script src="https://cdn.ln-cdn.com/staging/js/config2.js"></script>

<!-- Custom Code (Footer) -->
${customCodes?.footer || ''}
</body>
</html>`;
}

/**
 * Parse markdown frontmatter (YAML between --- delimiters)
 */
function parseMarkdownFrontmatter(markdown: string): { content: string; frontmatter: Record<string, string> } {
  const frontmatter: Record<string, string> = {};
  let content = markdown;

  // Check for frontmatter (starts with ---)
  if (markdown.startsWith('---')) {
    const endIndex = markdown.indexOf('---', 3);
    if (endIndex !== -1) {
      const frontmatterStr = markdown.slice(3, endIndex).trim();
      content = markdown.slice(endIndex + 3).trim();

      // Parse simple YAML (key: value pairs)
      for (const line of frontmatterStr.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          frontmatter[key] = value;
        }
      }
    }
  }

  return { content, frontmatter };
}

/**
 * Convert markdown to HTML using marked
 */
function convertMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
