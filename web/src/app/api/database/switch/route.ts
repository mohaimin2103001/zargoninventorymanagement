import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const apiUrl = process.env.API_BASE_URL;

    // Forward the Authorization header from the frontend request
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${apiUrl}/api/database/switch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Database switch API error:', error);
    return NextResponse.json(
      { error: 'Failed to switch database' },
      { status: 500 }
    );
  }
}

