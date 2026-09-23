/**
 * Media Commands
 *
 * Commands for uploading media files to website CDN storage.
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LindoClient, AuthenticationError } from 'lindoai';
import { loadConfig, hasApiKey } from '../config';
import { success, error, info, output, type OutputFormat } from '../output';

/**
 * Infer content type from file extension.
 */
function inferContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    pdf: 'application/pdf',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Infer media type from file extension.
 */
function inferMediaType(fileName: string): 'images' | 'videos' | 'documents' | 'fonts' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp', 'tiff'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const fontExts = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
  if (imageExts.includes(ext)) return 'images';
  if (videoExts.includes(ext)) return 'videos';
  if (fontExts.includes(ext)) return 'fonts';
  return 'documents';
}

/**
 * Creates the media command group.
 *
 * @returns The media command
 */
export function createMediaCommand(): Command {
  const media = new Command('media').description('Media upload operations');

  // media upload
  media
    .command('upload')
    .description('Upload a single media file to website CDN')
    .argument('<website_id>', 'Website ID')
    .argument('<file_path>', 'Path to the file to upload')
    .option('-t, --type <type>', 'Media type (images, videos, documents, fonts)')
    .option('-n, --name <name>', 'Override file name for CDN')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, filePath: string, options: { type?: string; name?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          error(`File not found: ${resolvedPath}`);
          process.exit(1);
        }

        const fileName = options.name || path.basename(resolvedPath);
        const fileBuffer = fs.readFileSync(resolvedPath);
        const fileBase64 = fileBuffer.toString('base64');
        const mediaType = (options.type as 'images' | 'videos' | 'documents' | 'fonts') || inferMediaType(fileName);
        const contentType = inferContentType(fileName);

        info(`Uploading ${fileName} (${mediaType}) to website ${websiteId}...`);

        const response = await client.media.upload(websiteId, {
          file_base64: fileBase64,
          file_name: fileName,
          media_type: mediaType,
          content_type: contentType,
        });

        success(`Uploaded: ${response.result.url}`);
        output(response.result, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  // media upload-batch
  media
    .command('upload-batch')
    .description('Upload multiple media files to website CDN (max 20)')
    .argument('<website_id>', 'Website ID')
    .argument('<file_paths...>', 'Paths to files to upload')
    .option('-t, --type <type>', 'Media type override for all files')
    .option('-f, --format <format>', 'Output format (json, table)', 'table')
    .action(async (websiteId: string, filePaths: string[], options: { type?: string; format: OutputFormat }) => {
      const client = getClient();

      try {
        if (filePaths.length > 20) {
          error('Maximum 20 files per batch upload');
          process.exit(1);
        }

        const files = filePaths.map((fp) => {
          const resolvedPath = path.resolve(fp);
          if (!fs.existsSync(resolvedPath)) {
            error(`File not found: ${resolvedPath}`);
            process.exit(1);
          }

          const fileName = path.basename(resolvedPath);
          const fileBuffer = fs.readFileSync(resolvedPath);
          const fileBase64 = fileBuffer.toString('base64');
          const mediaType = (options.type as 'images' | 'videos' | 'documents' | 'fonts') || inferMediaType(fileName);
          const contentType = inferContentType(fileName);

          return {
            file_base64: fileBase64,
            file_name: fileName,
            media_type: mediaType,
            content_type: contentType,
          };
        });

        info(`Uploading ${files.length} file(s) to website ${websiteId}...`);

        const response = await client.media.uploadBatch(websiteId, { files });

        success(`Uploaded ${response.result.successful} of ${response.result.total} files`);
        if (response.result.failed > 0) {
          info(`${response.result.failed} file(s) failed`);
        }
        output(response.result, options.format);
      } catch (err) {
        handleError(err);
      }
    });

  return media;
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
