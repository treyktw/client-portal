// app/api/places-autocomplete/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    // For Google Places API, you need an API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.warn('GOOGLE_PLACES_API_KEY not configured');
      // Return empty predictions if no API key
      return NextResponse.json({ predictions: [] });
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      return NextResponse.json(data);
    } else {
      console.error('Google Places API error:', data.status);
      return NextResponse.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json({ predictions: [] });
  }
}