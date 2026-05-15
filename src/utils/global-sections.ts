/**
 * Global Section Handling Utilities
 *
 * Provides functions for extracting and injecting global header/footer sections
 * in page HTML content.
 *
 * Global sections are identified by being direct children of main content:
 * - First `<header>` element at root level = global header
 * - First `<footer>` element at root level = global footer
 *
 * @satisfies Requirements 4.3, 5.3
 */

/**
 * Result of extracting global sections from HTML content.
 */
export interface GlobalSections {
  /** The extracted global header HTML, if found */
  globalHeader?: string;
  /** The extracted global footer HTML, if found */
  globalFooter?: string;
  /** The remaining main content after extraction */
  mainContent: string;
}

/** ID used to identify global header sections */
export const GLOBAL_HEADER_ID = '_global_header0000';

/** ID used to identify global footer sections */
export const GLOBAL_FOOTER_ID = '_global_footer0000';

/**
 * Extracts a direct child element by tag name from HTML content.
 * Only matches elements that are at the root level (not nested inside other sections).
 *
 * @param html - The HTML content to search
 * @param tagName - The tag name to find (e.g., 'header', 'footer')
 * @returns Object containing the extracted section and remaining HTML
 */
function extractDirectChildByTag(
  html: string,
  tagName: string
): { section?: string; remainingHtml: string } {
  // Find the opening tag at root level
  // We need to ensure it's not nested inside another section/header/footer
  const openingTagPattern = new RegExp(
    `<${tagName}\\b[^>]*>`,
    'gi'
  );
  
  let match;
  let foundMatch: RegExpExecArray | null = null;
  
  while ((match = openingTagPattern.exec(html)) !== null) {
    const beforeMatch = html.slice(0, match.index);
    
    // Check if this tag is at root level by counting open/close tags before it
    // A root-level element should have balanced section/header/footer tags before it
    if (isAtRootLevel(beforeMatch)) {
      foundMatch = match;
      break;
    }
  }
  
  if (!foundMatch || foundMatch.index === undefined) {
    return { section: undefined, remainingHtml: html };
  }
  
  const startIndex = foundMatch.index;
  const openingTagEnd = startIndex + foundMatch[0].length;
  
  // Find the matching closing tag, handling nested elements
  const closingTag = `</${tagName}>`;
  const remainingHtml = html.slice(openingTagEnd);
  
  const elementOpenPattern = new RegExp(`<${tagName}\\b`, 'gi');
  const elementClosePattern = new RegExp(`</${tagName}>`, 'gi');
  
  const openTags: number[] = [];
  const closeTags: number[] = [];
  
  let m;
  while ((m = elementOpenPattern.exec(remainingHtml)) !== null) {
    openTags.push(m.index + openingTagEnd);
  }
  
  while ((m = elementClosePattern.exec(remainingHtml)) !== null) {
    closeTags.push(m.index + openingTagEnd);
  }
  
  // Merge and sort all tag positions
  const allTags = [
    ...openTags.map(pos => ({ pos, type: 'open' as const })),
    ...closeTags.map(pos => ({ pos, type: 'close' as const })),
  ].sort((a, b) => a.pos - b.pos);
  
  // Find the matching closing tag
  let depth = 1;
  let endIndex = -1;
  for (const tag of allTags) {
    if (tag.type === 'open') {
      depth++;
    } else {
      depth--;
      if (depth === 0) {
        endIndex = tag.pos + closingTag.length;
        break;
      }
    }
  }
  
  if (endIndex === -1) {
    return { section: undefined, remainingHtml: html };
  }
  
  // Extract the complete section
  const section = html.slice(startIndex, endIndex);
  
  // Remove the section from the HTML
  const beforeSection = html.slice(0, startIndex);
  const afterSection = html.slice(endIndex);
  
  // Clean up any extra whitespace left behind
  const cleanedRemainingHtml = (beforeSection + afterSection).replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return { section, remainingHtml: cleanedRemainingHtml };
}

/**
 * Checks if a position in HTML is at root level (not nested inside section/header/footer).
 */
function isAtRootLevel(htmlBefore: string): boolean {
  // Count open and close tags for section, header, footer
  const containerTags = ['section', 'header', 'footer'];
  let depth = 0;
  
  for (const tag of containerTags) {
    const openPattern = new RegExp(`<${tag}\\b`, 'gi');
    const closePattern = new RegExp(`</${tag}>`, 'gi');
    
    const opens = (htmlBefore.match(openPattern) || []).length;
    const closes = (htmlBefore.match(closePattern) || []).length;
    
    depth += opens - closes;
  }
  
  return depth === 0;
}

/**
 * Extracts global header and footer sections from HTML content.
 *
 * Global sections are identified as direct children (root level) elements:
 * - `<header>` at root level = global header
 * - `<footer>` at root level = global footer
 *
 * @param html - The HTML content to parse
 * @returns Object containing extracted globalHeader, globalFooter, and mainContent
 *
 * @satisfies Requirements 4.3, 5.3
 */
export function extractGlobalSections(html: string): GlobalSections {
  // Extract global header (first root-level <header>)
  const headerResult = extractDirectChildByTag(html, 'header');
  
  // Extract global footer (first root-level <footer>) from remaining HTML
  const footerResult = extractDirectChildByTag(headerResult.remainingHtml, 'footer');
  
  return {
    globalHeader: headerResult.section,
    globalFooter: footerResult.section,
    mainContent: footerResult.remainingHtml.trim(),
  };
}

/**
 * Injects global header and footer sections into main content HTML.
 *
 * @param mainContent - The main HTML content to inject sections into
 * @param globalHeader - Optional global header HTML to prepend
 * @param globalFooter - Optional global footer HTML to append
 * @returns Combined HTML with global sections injected
 *
 * @satisfies Requirements 4.2, 5.2
 */
export function injectGlobalSections(
  mainContent: string,
  globalHeader?: string,
  globalFooter?: string
): string {
  const parts: string[] = [];

  // Prepend global header if provided and non-empty
  if (globalHeader && globalHeader.trim()) {
    parts.push(globalHeader.trim());
  }

  // Add main content (always included, even if empty)
  if (mainContent.trim()) {
    parts.push(mainContent.trim());
  }

  // Append global footer if provided and non-empty
  if (globalFooter && globalFooter.trim()) {
    parts.push(globalFooter.trim());
  }

  // Join with newlines for clean formatting
  return parts.join('\n');
}
