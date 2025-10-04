import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Courier create-order API proxy called');
    
    const body = await request.json();
    console.log('Courier API request:', {
      body,
      hasToken: !!request.headers.get('authorization'),
      apiBaseUrl: process.env.API_BASE_URL
    });

    const response = await fetch(`${process.env.API_BASE_URL}/api/courier/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
      body: JSON.stringify(body),
    });

    console.log('Backend response status:', response.status);
    const data = await response.json();
    console.log('Backend response data:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Courier create-order proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy courier create-order request' },
      { status: 500 }
    );
  }
}
