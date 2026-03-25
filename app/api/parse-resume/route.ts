import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ text: '' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let text = '';

    if (name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text ?? '';
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? '';
    } else if (name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('[parse-resume] Parse error:', error);
    return NextResponse.json({ text: '' });
  }
}
