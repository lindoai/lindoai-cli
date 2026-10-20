import { describe, expect, it } from 'vitest';
import { extractHtmlData, preserveCanonical } from '../src/utils/html-extraction';
describe('CLI canonical URLs', () => {
  it.each([
    '<link rel="canonical" href="https://example.com/page">',
    "<link href='https://example.com/page' rel='canonical'>",
    '<LINK data-test="yes" HREF="https://example.com/page" REL="CANONICAL">',
  ])('extracts valid tag syntax: %s', tag => {
    expect(extractHtmlData(`<html><head>${tag}</head><body><main>Page</main></body></html>`).seo.canonical_url).toBe('https://example.com/page');
  });
  it('decodes URL entities', () => {
    expect(extractHtmlData('<link rel="canonical" href="https://example.com/?a=1&amp;b=2">').seo.canonical_url).toBe('https://example.com/?a=1&b=2');
  });
  it('preserves existing canonical when updating a fragment', () => {
    const seo = extractHtmlData('<main>Updated content</main>').seo;
    expect(preserveCanonical(seo, { canonical_url: 'https://example.com/original' }).canonical_url).toBe('https://example.com/original');
  });
  it('supports clearing an override with an empty href', () => {
    const seo = extractHtmlData('<link rel="canonical" href="">').seo;
    expect(preserveCanonical(seo, { canonical_url: 'https://example.com/original' }).canonical_url).toBe('');
  });
  it('replaces an existing canonical', () => {
    const seo = extractHtmlData('<link rel="canonical" href="https://example.com/new">').seo;
    expect(preserveCanonical(seo, { canonical_url: 'https://example.com/old' }).canonical_url).toBe('https://example.com/new');
  });
});
