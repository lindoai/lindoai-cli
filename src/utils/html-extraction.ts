/**
 * HTML Extraction Utilities
 *
 * Shared utilities for extracting content, settings, SEO metadata,
 * and custom codes from HTML files. Used by both 'pages update' and
 * 'pages create-with-content' commands.
 */

import { extractGlobalSections, type GlobalSections } from './global-sections';

/**
 * Extracted data from an HTML file
 */
export interface ExtractedHtmlData {
  /** Main content HTML (without global header/footer) */
  html: string;
  /** Extracted global header section */
  globalHeader?: string;
  /** Extracted global footer section */
  globalFooter?: string;
  /** Page title from <title> tag */
  templateName?: string;
  /** Custom header code */
  headerCode?: string;
  /** Custom footer code */
  footerCode?: string;
  /** Theme settings */
  settings: {
    theme: {
      mode: 'Dark' | 'Light';
      direction: string;
      main_classes: string;
      animations_deactivated: boolean;
    };
    should_convert: boolean;
  };
  /** SEO metadata */
  seo: Record<string, any>;
  /** Custom codes object (only if non-empty) */
  customCodes?: { header?: string; footer?: string };
}

/**
 * Extracts all relevant data from a full HTML document.
 * 
 * This function extracts:
 * - Main content from <main> or <body> tags
 * - Global header/footer sections
 * - Custom codes from HTML comments
 * - Theme settings (dark mode, direction, main_classes, animations)
 * - Full SEO metadata (title, description, og tags, canonical, noindex/nofollow)
 *
 * @param fullHtml - The complete HTML document
 * @param defaultTitle - Default title to use if none found in HTML
 * @returns Extracted data ready for API calls
 */
export function extractHtmlData(fullHtml: string, defaultTitle?: string): ExtractedHtmlData {
  // Extract content from <main> tag if present, otherwise use body content
  // Use greedy match since there's only one <main> tag
  let rawMainContent: string;
  const mainMatch = fullHtml.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  
  if (mainMatch) {
    rawMainContent = mainMatch[1].trim();
  } else if (bodyMatch) {
    rawMainContent = bodyMatch[1].trim();
  } else {
    rawMainContent = fullHtml;
  }

  // Extract global header and footer sections from the main content
  const globalSections = extractGlobalSections(rawMainContent);
  const html = globalSections.mainContent;

  // Extract title from <title> tag
  const titleMatch = fullHtml.match(/<title>([^<]*)<\/title>/i);
  const templateName = titleMatch ? titleMatch[1].trim() : defaultTitle;

  // Extract custom_codes from HTML comments
  let headerCode = '';
  let footerCode = '';
  
  const headerCodeMatch = fullHtml.match(/<!-- Page Custom Code \(Header\) -->\s*([\s\S]*?)\s*<!-- End Page Custom Code \(Header\) -->/i);
  if (headerCodeMatch && headerCodeMatch[1].trim()) {
    headerCode = headerCodeMatch[1].trim();
  }
  
  const footerCodeMatch = fullHtml.match(/<!-- Page Custom Code \(Footer\) -->\s*([\s\S]*?)\s*<!-- End Page Custom Code \(Footer\) -->/i);
  if (footerCodeMatch && footerCodeMatch[1].trim()) {
    footerCode = footerCodeMatch[1].trim();
  }

  // Extract settings from the HTML
  // Parse <html> class for dark mode
  const htmlClassMatch = fullHtml.match(/<html[^>]*class="([^"]*)"/i);
  const isDark = htmlClassMatch ? htmlClassMatch[1].includes('dark') : true;
  
  // Parse <main> attributes for direction and main_classes
  const mainTagMatch = fullHtml.match(/<main[^>]*>/i);
  let direction = 'ltr';
  let mainClasses = '';
  if (mainTagMatch) {
    const dirMatch = mainTagMatch[0].match(/dir="([^"]*)"/i);
    if (dirMatch) direction = dirMatch[1];
    const classMatch = mainTagMatch[0].match(/class="([^"]*)"/i);
    if (classMatch) mainClasses = classMatch[1];
  }

  // Check if animations are deactivated (no motion script)
  const animationsDeactivated = !fullHtml.includes('motion@latest');

  // Extract full SEO metadata from HTML
  const metaDescMatch = fullHtml.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const ogTitleMatch = fullHtml.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  const ogDescMatch = fullHtml.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  const ogImageMatch = fullHtml.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  const canonicalMatch = fullHtml.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const noindexMatch = fullHtml.match(/noindex/i);
  const nofollowMatch = fullHtml.match(/nofollow/i);

  // Build SEO object
  const seo: Record<string, any> = {};
  if (templateName) seo.page_title = templateName;
  if (metaDescMatch && metaDescMatch[1]) seo.meta_description = metaDescMatch[1];
  if (ogTitleMatch && ogTitleMatch[1]) seo.social_title = ogTitleMatch[1];
  if (ogDescMatch && ogDescMatch[1]) seo.social_description = ogDescMatch[1];
  if (ogImageMatch && ogImageMatch[1]) seo.social_image = ogImageMatch[1];
  if (canonicalMatch && canonicalMatch[1]) seo.canonical_url = canonicalMatch[1];
  seo.noindex = !!noindexMatch;
  seo.nofollow = !!nofollowMatch;

  // Build settings object
  const settings = {
    theme: {
      mode: isDark ? 'Dark' as const : 'Light' as const,
      direction: direction,
      main_classes: mainClasses,
      animations_deactivated: animationsDeactivated,
    },
    should_convert: true,
  };

  // Build custom_codes object
  const customCodes: { header?: string; footer?: string } | undefined = 
    (headerCode || footerCode) ? {} : undefined;
  if (customCodes) {
    if (headerCode) customCodes.header = headerCode;
    if (footerCode) customCodes.footer = footerCode;
  }

  return {
    html,
    globalHeader: globalSections.globalHeader,
    globalFooter: globalSections.globalFooter,
    templateName,
    headerCode: headerCode || undefined,
    footerCode: footerCode || undefined,
    settings,
    seo,
    customCodes,
  };
}
