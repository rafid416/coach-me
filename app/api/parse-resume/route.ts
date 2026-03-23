import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ text: '' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);

    return NextResponse.json({ text: result.text ?? '' });
  } catch (error) {
    console.error('[parse-resume] PDF parse error:', error);
    return NextResponse.json({ text: '' });
  }
}
