import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('Proxy: Forwarding backup restore request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/backup/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend backup restore response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend backup restore error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to restore backup' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Backup restore successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding backup restore request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

