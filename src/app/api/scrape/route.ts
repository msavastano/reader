import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

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

    // Create a controller to abort the fetch if it takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    let response;
    try {
      // Fetch the page
      response = await fetch(parsedUrl.toString(), {
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
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'Request to target site timed out' }, { status: 504 });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status} ${response.statusText}` },
        { status: response.status === 403 || response.status === 401 ? 403 : 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, iframe, noscript, svg, [hidden], .ad, .advertisement, .social-share, .comments').remove();

    // Extract content - try to find the main article container
    let contentEl = $('article, [role="main"], main, .post-content, .entry-content, #content, .story-text').first();
    
    // If no semantic tag found, try to find the container with the most paragraphs
    if (!contentEl.length) {
      let maxP = 0;
      $('div, section').each((i, el) => {
        const pCount = $(el).find('p').length;
        if (pCount > maxP) {
            maxP = pCount;
            contentEl = $(el);
        }
      });
    }

    // If still nothing, fallback to body
    if (!contentEl.length) {
        contentEl = $('body');
    }

    const content = contentEl.html() || '';
    const textContent = contentEl.text().trim(); // Clean text for word count

    if (!content || textContent.length < 100) {
       return NextResponse.json(
        { error: 'Could not extract article content. The page might be empty or require JavaScript.' },
        { status: 422 }
      );
    }

    // Extract metadata
    const siteName = 
        $('meta[property="og:site_name"]').attr('content') || 
        parsedUrl.hostname.replace('www.', '');

    let title = 
        $('meta[property="og:title"]').attr('content') || 
        $('h1').first().text().trim() || 
        $('title').text().trim() || 
        'Untitled';
    
    // Simple title cleaning
    if (siteName && title.includes(siteName)) {
        title = title.replace(new RegExp(`\\s*[-|:]\\s*${siteName}.*`, 'i'), '').trim();
    }


    // Extract author
    let author = '';
    
    // Strategy 1: Check standard meta tags
    author = $('meta[name="author"]').attr('content') || 
             $('meta[property="article:author"]').attr('content') || '';
    
    // Strategy 2: Check byline classes if meta failed
    if (!author) {
        const bylineSelectors = [
            '.byline', '.author-name', '.entry-author', '.post-author',
            '.story-author', '[rel="author"]', '.article-author'
        ];
        for (const sel of bylineSelectors) {
            const el = $(sel).first();
            if (el.length) {
                author = el.text().trim();
                break;
            }
        }
    }

    // Strategy 3: Check for "by X" text pattern in the first few paragraphs
    if (!author) {
        // limit to first 1000 chars of text content
        const introText = contentEl.text().substring(0, 1000); 
        const byMatch = introText.match(/^by\s+([A-Z][a-zA-Z\s.'-]+)/m);
        if (byMatch) {
            author = byMatch[1].trim();
        }
    }
    
    // Clean up author
    if (author) {
        author = author.replace(/^by\s+/i, '').trim();
        const siteNameLower = (siteName || '').toLowerCase();
        if (author.toLowerCase() === siteNameLower || siteNameLower.includes(author.toLowerCase())) {
            author = ''; // It's likely the site name, not an author
        }
    }

    // Better Title Cleaning
    if (siteName) {
      const escapedSite = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`\\s*[:\\|–—]\\s*${escapedSite}.*$`, 'i'), '').trim();
      title = title.replace(new RegExp(`\\s+-\\s+${escapedSite}.*$`, 'i'), '').trim();
    }
    title = title.replace(/\s*[:\|–—]\s*Science Fiction\s*[&]\s*Fantasy\s*$/i, '').trim();

    if (author) {
      const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`\\s+by\\s+${escapedAuthor}\\s*$`, 'i'), '').trim();
    }

    // Word count
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      title: title || 'Untitled',
      author,
      content, // This is the HTML content from Cheerio
      excerpt: textContent.substring(0, 200) + '...',
      siteName,
      wordCount,
    });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape story. The site may block automated access.', details: error.message },
      { status: 500 }
    );
  }
}
