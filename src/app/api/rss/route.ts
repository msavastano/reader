import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const RSS_FEEDS: Record<string, string> = {
  clarkesworld: 'https://clarkesworldmagazine.com/feed/',
  // < category > <![CDATA[fiction]]></category>
  // < category > <![CDATA[text]]></category>
  lightspeed: 'https://www.lightspeedmagazine.com/rss-2/',
  // < category >
  // <![CDATA[Fiction]]>
  // </category>
  'strange horizons': 'https://strangehorizons.com/wordpress/fiction/feed/',
  // <category><![CDATA[Fiction]]></category>
  'nightmare': 'https://www.nightmare-magazine.com/rss-2/',
  // < category >
  // <![CDATA[Fiction]]>
  // </category>
  'apex': 'https://www.apexbookcompany.com/a/blog/apex-magazine/rss/feed',
  //  < category >
  // <![CDATA[Short Fiction]]>
  //   </category>
};

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get('site');
  if (!site || !RSS_FEEDS[site]) {
    return NextResponse.json({ error: 'Invalid site' }, { status: 400 });
  }

  try {
    const res = await fetch(RSS_FEEDS[site], {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; reader-app/1.0)' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 502 });
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: { title: string; url: string; author: string }[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').first().text().trim();
      // <link> in RSS 2.0 can be tricky with Cheerio; fall back to <guid>
      const link =
        $(el).find('link').first().text().trim() ||
        $(el).find('guid').first().text().trim();

      // Only include fiction items
      const categories: string[] = [];
      $(el).find('category').each((_, cat) => {
        categories.push($(cat).text().trim().toLowerCase());
      });
      const isFiction = categories.some(
        (c) => c.includes('fiction') && !c.includes('nonfiction') && !c.includes('non-fiction'),
      );

      const author =
        $(el).find('dc\\:creator').first().text().trim() ||
        $(el).find('author').first().text().trim();

      const isAudio = title.toLowerCase().includes('(audio)');

      if (title && link && link.startsWith('http') && isFiction && !isAudio) {
        items.push({ title, url: link, author });
      }
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Failed to parse RSS feed' }, { status: 500 });
  }
}
