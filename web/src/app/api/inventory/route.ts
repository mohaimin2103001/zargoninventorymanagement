import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    console.log('Proxy: Forwarding inventory GET request to backend');
    
    const url = `${process.env.API_BASE_URL}/api/inventory${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend inventory response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend inventory error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to fetch inventory' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Inventory fetch successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding inventory request:', error);
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
    
    console.log('Proxy: Forwarding inventory POST request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend inventory POST response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend inventory POST error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to create inventory item' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Inventory POST successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding inventory POST request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

