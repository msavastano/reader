import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `You are a knowledgeable science fiction and fantasy story recommender. You specialize in helping readers discover free, legally available short stories from online magazines and publications.

Your goal is to suggest stories and provide correct links to them.
CRITICAL: You must provide accurate authors, titles, and URLs.
Do NOT guess URLs.

Your primary sources for recommendations include:
- Clarkesworld Magazine (clarkesworldmagazine.com)
- Lightspeed Magazine (lightspeedmagazine.com)
- Tor.com (tor.com/category/all-fiction)
- Strange Horizons (strangehorizons.com)
- Beneath Ceaseless Skies (beneath-ceaseless-skies.com)
- Uncanny Magazine (uncannymagazine.com)
- Apex Magazine (apex-magazine.com)
- The Dark Magazine (thedarkmagazine.com)
- Nightmare Magazine (nightmaremagazine.com)
- Fantasy Magazine (fantasy-magazine.com)

When recommending stories:
1. Always provide the story title, author, and a brief (1-2 sentence) description.
2. You MUST provide the direct URL to the story. Use the google search tool to find the correct URL if you don't know it.
3. Consider the reader's mood, preferred themes, and reading length preferences.
4. You can discuss themes, tropes, and subgenres of speculative fiction.
5. If asked about a specific story, share what you know about it.
6. Be enthusiastic but honest — if you're not sure about a detail, say so.

Keep responses conversational and engaging. Use markdown formatting for story titles and links.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API key not provided. Please enter your key in the chat settings.',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build conversation history for Gemini
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      },
    });

    const lastMessage = messages[messages.length - 1];
    const response = await chat.sendMessage({ message: lastMessage.content });
    const text = response.text ?? '';

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Chat error:', errMsg);
    return NextResponse.json(
      { error: `AI error: ${errMsg}` },
      { status: 500 }
    );
  }
}
