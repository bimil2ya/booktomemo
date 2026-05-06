import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = await image.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.type as "image/jpeg" | "image/png" | "image/gif" | "image/webkitp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "이 이미지에서 책 제목과 저자 이름을 추출해줘. 다른 설명 없이 '제목: [제목], 저자: [저자]' 형식으로만 답해줘. 만약 저자를 모르겠으면 제목만 알려줘.",
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const text = content.text;
      // '제목: [제목], 저자: [저자]' 형식에서 데이터 추출
      const titleMatch = text.match(/제목:\s*(.+?)(?:,|$)/);
      const authorMatch = text.match(/저자:\s*(.+?)(?:,|$)/);

      const title = titleMatch ? titleMatch[1].trim() : '';
      const author = authorMatch ? authorMatch[1].trim() : '';

      return NextResponse.json({ title, author, fullText: text });
    }

    return NextResponse.json({ error: 'Failed to extract text' }, { status: 500 });
  } catch (error: any) {
    console.error('Claude OCR Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
