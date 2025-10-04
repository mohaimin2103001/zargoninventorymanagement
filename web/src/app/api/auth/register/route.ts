import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to your backend API
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: { message: 'Registration failed' } },
      { status: 500 }
    );
  }
}
