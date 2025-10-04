import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('Proxy: Forwarding orders GET request to backend');
    
    const url = `${process.env.API_BASE_URL}/api/orders${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend orders response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend orders error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to fetch orders' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Orders fetch successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding orders request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('Proxy: Forwarding orders POST request to backend');
    console.log('Proxy: Request body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend orders POST response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend orders POST error:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: errorText },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log('Proxy: Orders POST successful, response:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding orders POST request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

