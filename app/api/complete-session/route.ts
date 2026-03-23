import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const { error } = await supabase
    .from('session_attempts')
    .insert({ ip, completed_at: new Date().toISOString() });

  if (error) {
    console.error('[complete-session] Supabase error:', error.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
