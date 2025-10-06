// app/api/validate-website/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    // Add protocol if missing
    const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
    
    // Try to fetch the website with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(urlToCheck, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false, error: `Website returned status ${response.status}` });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ valid: false, error: 'Website took too long to respond' });
    }
    return NextResponse.json({ valid: false, error: 'Website not reachable' });
  }
}