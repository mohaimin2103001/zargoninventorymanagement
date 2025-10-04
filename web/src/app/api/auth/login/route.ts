import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Proxy: Forwarding login request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend error:', errorText);
      return NextResponse.json(
        { error: { message: 'Login failed' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Login successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
