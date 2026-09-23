/**
 * Local Assets Utility
 * 
 * Extracts local/relative asset paths from HTML, uploads them to CDN,
 * and replaces the paths with CDN URLs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cheerio from 'cheerio';
import type { LindoClient } from 'lindoai';

/**
 * Asset reference found in HTML
 */
export interface AssetReference {
  /** Original path in the HTML */
  originalPath: string;
  /** Absolute path on the local filesystem */
  absolutePath: string;
  /** File name */
  fileName: string;
  /** Media type for upload */
  mediaType: 'images' | 'videos' | 'documents' | 'fonts';
  /** MIME content type */
  contentType: string;
}

/**
 * Result of processing local assets
 */
export interface ProcessedAssetsResult {
  /** Updated HTML with CDN URLs */
  html: string;
  /** Number of assets uploaded */
  uploadedCount: number;
  /** Number of assets that failed */
  failedCount: number;
  /** Map of original paths to CDN URLs */
  urlMap: Map<string, string>;
  /** Whether the source file was updated */
  sourceFileUpdated: boolean;
}

/**
 * Check if a path is a relative/local path (not absolute URL)
 */
function isLocalPath(src: string): boolean {
  if (!src) return false;
  // Skip absolute URLs, data URLs, and protocol-relative URLs
  if (src.startsWith('http://') || src.startsWith('https://') || 
      src.startsWith('//') || src.startsWith('data:') ||
      src.startsWith('blob:') || src.startsWith('#')) {
    return false;
  }
  return true;
}

/**
 * Infer media type from file extension
 */
function inferMediaType(fileName: string): 'images' | 'videos' | 'documents' | 'fonts' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp', 'tiff'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'];
  const fontExts = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
  
  if (imageExts.includes(ext)) return 'images';
  if (videoExts.includes(ext)) return 'videos';
  if (fontExts.includes(ext)) return 'fonts';
  return 'documents';
}

/**
 * Infer content type from file extension
 */
function inferContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'avif': 'image/avif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'ogv': 'video/ogg',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Extract all local asset references from HTML
 * 
 * @param html - The HTML content to scan
 * @param basePath - Base directory path for resolving relative paths
 * @returns Array of asset references found
 */
export function extractLocalAssets(html: string, basePath: string): AssetReference[] {
  const $ = cheerio.load(html);
  const assets: AssetReference[] = [];
  const seenPaths = new Set<string>();

  // Extract from img src
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && isLocalPath(src) && !seenPaths.has(src)) {
      seenPaths.add(src);
      const absolutePath = path.resolve(basePath, src);
      if (fs.existsSync(absolutePath)) {
        assets.push({
          originalPath: src,
          absolutePath,
          fileName: path.basename(src),
          mediaType: inferMediaType(src),
          contentType: inferContentType(src),
        });
      }
    }
  });

  // Extract from img srcset
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      // Parse srcset: "image1.jpg 1x, image2.jpg 2x" or "image1.jpg 300w, image2.jpg 600w"
      const parts = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
      for (const src of parts) {
        if (src && isLocalPath(src) && !seenPaths.has(src)) {
          seenPaths.add(src);
          const absolutePath = path.resolve(basePath, src);
          if (fs.existsSync(absolutePath)) {
            assets.push({
              originalPath: src,
              absolutePath,
              fileName: path.basename(src),
              mediaType: inferMediaType(src),
              contentType: inferContentType(src),
            });
          }
        }
      }
    }
  });

  // Extract from source src (for video/audio)
  $('source[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && isLocalPath(src) && !seenPaths.has(src)) {
      seenPaths.add(src);
      const absolutePath = path.resolve(basePath, src);
      if (fs.existsSync(absolutePath)) {
        assets.push({
          originalPath: src,
          absolutePath,
          fileName: path.basename(src),
          mediaType: inferMediaType(src),
          contentType: inferContentType(src),
        });
      }
    }
  });

  // Extract from video poster
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    if (poster && isLocalPath(poster) && !seenPaths.has(poster)) {
      seenPaths.add(poster);
      const absolutePath = path.resolve(basePath, poster);
      if (fs.existsSync(absolutePath)) {
        assets.push({
          originalPath: poster,
          absolutePath,
          fileName: path.basename(poster),
          mediaType: 'images',
          contentType: inferContentType(poster),
        });
      }
    }
  });

  // Extract from background-image in style attributes
  $('[style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (urlMatch && urlMatch[1]) {
      const src = urlMatch[1];
      if (isLocalPath(src) && !seenPaths.has(src)) {
        seenPaths.add(src);
        const absolutePath = path.resolve(basePath, src);
        if (fs.existsSync(absolutePath)) {
          assets.push({
            originalPath: src,
            absolutePath,
            fileName: path.basename(src),
            mediaType: inferMediaType(src),
            contentType: inferContentType(src),
          });
        }
      }
    }
  });

  // Extract from link href (for favicons, etc.)
  $('link[href][rel*="icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && isLocalPath(href) && !seenPaths.has(href)) {
      seenPaths.add(href);
      const absolutePath = path.resolve(basePath, href);
      if (fs.existsSync(absolutePath)) {
        assets.push({
          originalPath: href,
          absolutePath,
          fileName: path.basename(href),
          mediaType: 'images',
          contentType: inferContentType(href),
        });
      }
    }
  });

  return assets;
}

/**
 * Upload local assets to CDN and replace paths in HTML
 * 
 * @param html - The HTML content with local asset paths
 * @param basePath - Base directory path for resolving relative paths
 * @param websiteId - Website ID to upload assets to
 * @param client - Lindo SDK client
 * @param onProgress - Optional callback for progress updates
 * @param sourceFilePath - Optional path to source file to update with CDN URLs
 * @returns Processed result with updated HTML and upload stats
 */
export async function processLocalAssets(
  html: string,
  basePath: string,
  websiteId: string,
  client: LindoClient,
  onProgress?: (message: string) => void,
  sourceFilePath?: string
): Promise<ProcessedAssetsResult> {
  const assets = extractLocalAssets(html, basePath);
  
  if (assets.length === 0) {
    return {
      html,
      uploadedCount: 0,
      failedCount: 0,
      urlMap: new Map(),
      sourceFileUpdated: false,
    };
  }

  onProgress?.(`Found ${assets.length} local asset(s) to upload`);

  const urlMap = new Map<string, string>();
  let uploadedCount = 0;
  let failedCount = 0;

  // Upload assets in batches of 10 for efficiency
  const batchSize = 10;
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    
    // Prepare batch upload data
    const files = batch.map(asset => {
      const fileData = fs.readFileSync(asset.absolutePath);
      const base64 = fileData.toString('base64');
      return {
        file_base64: base64,
        file_name: asset.fileName,
        media_type: asset.mediaType,
        content_type: asset.contentType,
      };
    });

    try {
      // Use batch upload if available, otherwise upload individually
      if (files.length > 1 && client.media.uploadBatch) {
        const response = await client.media.uploadBatch(websiteId, { files });
        
        for (let j = 0; j < response.result.uploaded.length; j++) {
          const result = response.result.uploaded[j];
          const asset = batch[j];
          
          if (result.success) {
            urlMap.set(asset.originalPath, result.url);
            uploadedCount++;
            onProgress?.(`Uploaded: ${asset.fileName} → ${result.url}`);
          } else {
            failedCount++;
            onProgress?.(`Failed: ${asset.fileName} - ${result.error}`);
          }
        }
      } else {
        // Upload individually
        for (let j = 0; j < files.length; j++) {
          const file = files[j];
          const asset = batch[j];
          
          try {
            const response = await client.media.upload(websiteId, file);
            urlMap.set(asset.originalPath, response.result.url);
            uploadedCount++;
            onProgress?.(`Uploaded: ${asset.fileName} → ${response.result.url}`);
          } catch (err) {
            failedCount++;
            onProgress?.(`Failed: ${asset.fileName} - ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }
    } catch (err) {
      // Batch upload failed, try individual uploads
      for (let j = 0; j < files.length; j++) {
        const file = files[j];
        const asset = batch[j];
        
        try {
          const response = await client.media.upload(websiteId, file);
          urlMap.set(asset.originalPath, response.result.url);
          uploadedCount++;
          onProgress?.(`Uploaded: ${asset.fileName} → ${response.result.url}`);
        } catch (individualErr) {
          failedCount++;
          onProgress?.(`Failed: ${asset.fileName} - ${individualErr instanceof Error ? individualErr.message : 'Unknown error'}`);
        }
      }
    }
  }

  // Replace paths in HTML using cheerio
  const $ = cheerio.load(html);

  // Replace img src
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && urlMap.has(src)) {
      $(el).attr('src', urlMap.get(src)!);
    }
  });

  // Replace img srcset
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      let newSrcset = srcset;
      for (const [originalPath, cdnUrl] of urlMap) {
        // Replace the path while preserving the descriptor (1x, 2x, 300w, etc.)
        newSrcset = newSrcset.replace(new RegExp(escapeRegExp(originalPath), 'g'), cdnUrl);
      }
      $(el).attr('srcset', newSrcset);
    }
  });

  // Replace source src
  $('source[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && urlMap.has(src)) {
      $(el).attr('src', urlMap.get(src)!);
    }
  });

  // Replace video poster
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    if (poster && urlMap.has(poster)) {
      $(el).attr('poster', urlMap.get(poster)!);
    }
  });

  // Replace background-image in style attributes
  $('[style*="background"]').each((_, el) => {
    let style = $(el).attr('style') || '';
    for (const [originalPath, cdnUrl] of urlMap) {
      style = style.replace(new RegExp(escapeRegExp(originalPath), 'g'), cdnUrl);
    }
    $(el).attr('style', style);
  });

  // Replace link href
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && urlMap.has(href)) {
      $(el).attr('href', urlMap.get(href)!);
    }
  });

  const updatedHtml = $.html();
  
  // Update the source file if path provided and assets were uploaded
  let sourceFileUpdated = false;
  if (sourceFilePath && uploadedCount > 0) {
    try {
      // Read the original source file and replace paths
      const originalSource = fs.readFileSync(sourceFilePath, 'utf-8');
      let updatedSource = originalSource;
      
      for (const [originalPath, cdnUrl] of urlMap) {
        // Replace all occurrences of the original path with CDN URL
        updatedSource = updatedSource.replace(new RegExp(escapeRegExp(originalPath), 'g'), cdnUrl);
      }
      
      // Only write if content changed
      if (updatedSource !== originalSource) {
        fs.writeFileSync(sourceFilePath, updatedSource, 'utf-8');
        sourceFileUpdated = true;
        onProgress?.(`Updated source file with CDN URLs: ${sourceFilePath}`);
      }
    } catch (err) {
      onProgress?.(`Warning: Could not update source file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    html: updatedHtml,
    uploadedCount,
    failedCount,
    urlMap,
    sourceFileUpdated,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
