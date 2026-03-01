import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const RSS_FEEDS: Record<string, string> = {
  clarkesworld: 'https://clarkesworldmagazine.com/feed/',
  lightspeed: 'https://www.lightspeedmagazine.com/rss-2/',
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

    const items: { title: string; url: string }[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').first().text().trim();
      // <link> in RSS 2.0 can be tricky with Cheerio; fall back to <guid>
      const link =
        $(el).find('link').first().text().trim() ||
        $(el).find('guid').first().text().trim();
      if (title && link && link.startsWith('http')) {
        items.push({ title, url: link });
      }
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Failed to parse RSS feed' }, { status: 500 });
  }
}
