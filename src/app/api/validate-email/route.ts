// app/api/validate-email/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    // Basic validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ valid: false, message: 'Invalid email format' });
    }

    // You can use a service like Abstract API, Hunter.io, or ZeroBounce
    // For now, we'll do basic MX record checking
    const domain = email.split('@')[1];
    
    // In production, use a real email validation service
    // This is a simplified example
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      return NextResponse.json({ valid: true, message: 'Email domain verified' });
    } else {
      return NextResponse.json({ valid: false, message: 'Email domain not found' });
    }
  } catch (error) {
    return NextResponse.json({ valid: true, message: '' }); // Fail open for now
  }
}