import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    // Forward query parameters (startDate, endDate) to backend
    const queryString = searchParams.toString();
    const backendUrl = `${process.env.API_BASE_URL}/api/reports${queryString ? `?${queryString}` : ''}`;
    
    console.log('Proxy: Forwarding reports request to backend');
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend reports response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend reports error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to fetch reports' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Reports fetch successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding reports request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
