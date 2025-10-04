import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Get all users proxy route called');
    
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    const backendUrl = `${process.env.API_BASE_URL}/api/users/all`;
    console.log('Calling backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log('Backend error response:', errorData);
      return NextResponse.json(
        { error: { code: 'BACKEND_ERROR', message: errorData } },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Backend response data:', JSON.stringify(data));
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Get all users API proxy error:', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

