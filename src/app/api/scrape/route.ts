import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Parse with JSDOM + Readability
    const dom = new JSDOM(html, { url: parsedUrl.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: 'Could not extract article content from this page. It may not be a story/article page.' },
        { status: 422 }
      );
    }

    // Get site name (extract early so we can use it to validate author)
    const siteName =
      article.siteName ||
      dom.window.document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
      parsedUrl.hostname.replace('www.', '');

    // Extract author from meta or article
    let author = article.byline || '';
    if (!author) {
      const metaAuthor = dom.window.document.querySelector('meta[name="author"]');
      if (metaAuthor) {
        author = metaAuthor.getAttribute('content') || '';
      }
    }
    // Clean up author - remove "by " prefix
    author = author.replace(/^by\s+/i, '').trim();

    // If author looks like the site/magazine name, try harder to find the real author
    const authorLower = author.toLowerCase();
    const siteNameLower = (siteName || '').toLowerCase();
    const hostLower = parsedUrl.hostname.replace('www.', '').toLowerCase();
    if (!author || authorLower === siteNameLower || authorLower.includes(siteNameLower) || siteNameLower.includes(authorLower) || authorLower === hostLower) {
      author = ''; // Reset — this is the magazine, not the author

      // Strategy 1: Look for a "by Author" link/text near the story
      const bylineSelectors = [
        '.byline', '.author-name', '.entry-author', '.post-author',
        '.story-author', '[rel="author"]', '.article-author'
      ];
      for (const sel of bylineSelectors) {
        const el = dom.window.document.querySelector(sel);
        if (el) {
          author = (el.textContent || '').replace(/^by\s+/i, '').trim();
          if (author && author.toLowerCase() !== siteNameLower) break;
          author = '';
        }
      }

      // Strategy 2: Find text matching "by <Name>" pattern in the content
      if (!author) {
        const contentDom = new JSDOM(article.content || '');
        const allText = contentDom.window.document.body?.textContent || '';
        const byMatch = allText.match(/^by\s+([A-Z][a-zA-Z\s.'-]+)/m);
        if (byMatch) {
          author = byMatch[1].trim();
        }
      }

      // Strategy 3: Look for an "a" tag with href containing "/authors/" or "/author/"
      if (!author) {
        const authorLink = dom.window.document.querySelector('a[href*="/author"]');
        if (authorLink) {
          const linkText = (authorLink.textContent || '').trim();
          if (linkText && linkText.toLowerCase() !== siteNameLower) {
            author = linkText;
          }
        }
      }
    }

    // Better title extraction
    // Readability often uses og:title which for many magazine sites is the generic site name.
    // The actual document.title frequently has the pattern: "Story Title by Author : Site Name"
    // So we prefer document.title and clean it.
    const docTitle = dom.window.document.title || '';
    let title = docTitle || article.title || '';
    
    // Step 1: Remove site name suffixes like " : Clarkesworld Magazine" or " | Lightspeed"  
    if (siteName) {
      const escapedSite = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`\\s*[:\\|–—]\\s*${escapedSite}.*$`, 'i'), '').trim();
      title = title.replace(new RegExp(`\\s+-\\s+${escapedSite}.*$`, 'i'), '').trim();
    }
    // Also strip common generic suffixes
    title = title.replace(/\s*[:\|–—]\s*Science Fiction\s*[&]\s*Fantasy\s*$/i, '').trim();
    
    // Step 2: If title has "by Author" at the end, strip it
    if (author) {
      const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`\\s+by\\s+${escapedAuthor}\\s*$`, 'i'), '').trim();
    }
    
    // Step 3: If title is still the site name or empty, try og:title (but only if it's different from site name)
    if (!title || title === siteName || title.length < 3) {
      const ogTitle = dom.window.document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      if (ogTitle && ogTitle !== siteName && !ogTitle.includes(siteName || '')) {
        title = ogTitle;
      }
    }
    
    // Step 4: Last resort — try the first h1 inside the extracted content
    if (!title || title === siteName) {
      const contentDom = new JSDOM(article.content || '');
      const h1 = contentDom.window.document.querySelector('h1');
      if (h1) {
        title = h1.textContent?.trim() || 'Untitled';
      }
    }

    // Count words
    const textContent = article.textContent || '';
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      title: title || 'Untitled',
      author,
      content: article.content || '',
      excerpt: article.excerpt || textContent.substring(0, 200) + '...',
      siteName,
      wordCount,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape story. The site may block automated access.' },
      { status: 500 }
    );
  }
}
