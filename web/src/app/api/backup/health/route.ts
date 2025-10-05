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
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.log('Proxy: Backend backup health error:', errorData);
      // Return as 200 so frontend can display the message properly
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch backup health', disabled: true },
        { status: 200 }
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

