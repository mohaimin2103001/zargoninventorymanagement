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
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.log('Proxy: Backend backup restore error:', errorData);
      // Return as 200 so frontend can display the message properly
      return NextResponse.json(
        { error: errorData.error || 'Failed to restore backup', disabled: true },
        { status: 200 }
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

