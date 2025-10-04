import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    console.log('Proxy: Forwarding backup health request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/backup/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend backup health response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend backup health error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to fetch backup health' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Backup health fetch successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding backup health request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

