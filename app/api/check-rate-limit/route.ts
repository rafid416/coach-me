import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('session_attempts')
    .select('id')
    .eq('ip', ip)
    .not('completed_at', 'is', null)
    .gte('completed_at', startOfDay.toISOString())
    .limit(1);

  if (error) {
    console.error('[check-rate-limit] Supabase error:', error.message);
    return NextResponse.json({ allowed: true });
  }

  if (data && data.length > 0) {
    const resetAt = new Date();
    resetAt.setUTCHours(24, 0, 0, 0);
    return NextResponse.json({ allowed: false, resetAt: resetAt.toISOString() });
  }

  return NextResponse.json({ allowed: true });
}
