import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Proxy: Testing backend connection');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/auth/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Proxy: Backend test response status:', response.status);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend not reachable', status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log('Proxy: Backend test successful');
    
    return NextResponse.json({
      ...data,
      proxy: 'working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Proxy: Error testing backend:', error);
    return NextResponse.json(
      { error: 'Cannot reach backend', message: (error as Error).message },
      { status: 502 }
    );
  }
}

