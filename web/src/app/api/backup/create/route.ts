import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('Proxy: Forwarding backup create request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/backup/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend backup create response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend backup create error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to create backup' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Backup create successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding backup create request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

