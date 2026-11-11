import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes('your-project-ref') &&
      !key.includes('your-supabase-anon-key')
  );
}

export async function verifyApiRequest(
  req: NextRequest,
  options: { bucket: string; maxRequests: number; windowMs?: number; maxBodyBytes?: number }
): Promise<{ errorResponse: NextResponse | null }> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {
      errorResponse: NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 }),
    };
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  const maxBytes = options.maxBodyBytes ?? 262144; // 256 KB
  if (contentLength > maxBytes) {
    return {
      errorResponse: NextResponse.json({ error: 'Payload too large.' }, { status: 413 }),
    };
  }

  const ip = getClientIp(req);
  const allowed = checkRateLimit(
    `${options.bucket}:${ip}`,
    options.maxRequests,
    options.windowMs ?? 60000
  );
  if (!allowed) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      ),
    };
  }

  if (isSupabaseServerConfigured()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {
            // No-op in API guard check
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorResponse: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      };
    }
  }

  return { errorResponse: null };
}

