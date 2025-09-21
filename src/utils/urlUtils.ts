/**
 * Utility functions for URL parsing and manipulation
 */

/**
 * Extracts the domain name from a URL
 * @param url - The URL to extract domain from
 * @returns The domain name without protocol or path
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    return match ? match[1] : url;
  }
};

/**
 * Extracts a website name from a URL (removes common TLD extensions)
 * @param url - The URL to extract website name from
 * @returns The website name without domain extension
 */
export const extractWebsiteNameFromUrl = (url: string): string => {
  const domain = extractDomainFromUrl(url);
  // Remove common TLD extensions
  return domain.replace(/\.(com|org|net|edu|gov|mil|int|co\.uk|co\.jp|co\.au|ca|de|fr|it|es|nl|se|no|dk|fi|pl|ru|cn|jp|kr|in|br|mx|ar|cl|pe|ve|co|ec|uy|py|bo|gq|tk|ml|ga|cf|me|tv|cc|biz|info|name|mobi|pro|aero|coop|museum|jobs|travel|tel|xxx|asia|cat|post|xxx|local)$/i, '');
};