/**
 * Google Fonts Utilities
 *
 * Provides functions for generating Google Fonts URLs and HTML blocks
 * for use in page and blog previews.
 *
 * @satisfies Requirements 1.2, 1.3, 1.4, 1.5
 */

/**
 * Generates a Google Fonts API URL for the specified font families.
 *
 * This function takes an array of font names, filters out empty/undefined values,
 * and generates a properly formatted Google Fonts CSS2 API URL with weights
 * 300, 400, and 700.
 *
 * @param fonts - Array of font family names (e.g., ['Roboto', 'Open Sans'])
 * @returns Complete Google Fonts API URL, or empty string if no valid fonts provided
 *
 * @example
 * ```typescript
 * generateGoogleFontsUrl(['Roboto']); 
 * // 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap'
 * 
 * generateGoogleFontsUrl(['Roboto', 'Open Sans']);
 * // 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&family=Open+Sans:wght@300;400;700&display=swap'
 * 
 * generateGoogleFontsUrl(['', undefined, null]);
 * // ''
 * ```
 *
 * @satisfies Requirement 1.5
 */
export function generateGoogleFontsUrl(fonts: (string | undefined | null)[]): string {
  // Filter out empty/undefined/null fonts and trim whitespace
  const validFonts = fonts.filter((f): f is string => Boolean(f && f.trim()));
  
  if (validFonts.length === 0) {
    return '';
  }

  // Format: family=FontName:wght@300;400;700
  // Spaces in font names are replaced with '+' for URL encoding
  const fontParams = validFonts
    .map(font => `${font.trim().replace(/ /g, '+')}:wght@300;400;700`)
    .join('&family=');

  return `https://fonts.googleapis.com/css2?family=${fontParams}&display=swap`;
}

/**
 * Website theme settings interface for font configuration.
 */
export interface WebsiteTheme {
  font?: string;           // Default body font
  title_font?: string;     // Title/heading font
  mode?: 'Light' | 'Dark'; // Theme mode
  direction?: 'ltr' | 'rtl';
}

/**
 * Generates the complete Google Fonts HTML block including preconnect links,
 * stylesheet link, and CSS to apply the fonts to the page.
 *
 * This function extracts font and title_font from the theme, generates the
 * appropriate Google Fonts URL, and returns a complete HTML block with:
 * - Preconnect link for fonts.googleapis.com
 * - Preconnect link for fonts.gstatic.com (with crossorigin)
 * - Stylesheet link with the generated fonts URL
 * - Style block that applies the fonts to body and headings
 *
 * @param theme - Website theme object containing font configuration
 * @returns Complete HTML block with preconnect, stylesheet links, and font CSS, or empty string if no fonts configured
 *
 * @example
 * ```typescript
 * generateGoogleFontsHtml({ font: 'Roboto', title_font: 'Open Sans' });
 * // Returns preconnect links, stylesheet link, and CSS applying fonts
 *
 * generateGoogleFontsHtml({});
 * // Returns: ''
 * ```
 *
 * @satisfies Requirements 1.2, 1.3, 1.4
 */
export function generateGoogleFontsHtml(theme: WebsiteTheme): string {
  // Extract fonts from theme, filtering out undefined/empty values
  const fonts = [theme.font, theme.title_font].filter(Boolean);

  if (fonts.length === 0) {
    return '';
  }

  const fontsUrl = generateGoogleFontsUrl(fonts as string[]);

  // Return empty string if URL generation failed (shouldn't happen with valid fonts)
  if (!fontsUrl) {
    return '';
  }

  // Build CSS to apply fonts
  const bodyFont = theme.font || theme.title_font;
  const titleFont = theme.title_font || theme.font;
  
  const fontCss = `
    <style>
      /* Apply website fonts from theme */
      body, main, .prose {
        font-family: '${bodyFont}', system-ui, sans-serif !important;
      }
      h1, h2, h3, h4, h5, h6, .font-display, .font-serif {
        font-family: '${titleFont}', system-ui, serif !important;
      }
    </style>`;

  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsUrl}" rel="stylesheet">${fontCss}`;
}

