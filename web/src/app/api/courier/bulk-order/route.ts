/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function POST(request: NextRequest) {
  console.log('Courier bulk-order API proxy called');
  
  try {
    const body = await request.json();
    const token = request.headers.get('authorization');
    
    console.log('Courier API request:', {
      body: body,
      hasToken: !!token,
      apiBaseUrl: API_BASE_URL
    });

    const response = await fetch(`${API_BASE_URL}/api/courier/bulk-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || '',
      },
      body: JSON.stringify(body),
    });

    console.log('Backend response status:', response.status);
    const data = await response.json();
    console.log('Backend response data:', data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Courier bulk-order proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with courier service' },
      { status: 500 }
    );
  }
}
