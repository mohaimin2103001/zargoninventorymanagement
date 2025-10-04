import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(request: NextRequest) {
  try {
    console.log('Proxy: Forwarding customer rankings request to backend');
    
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/api/customer-rankings${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('Proxy: Backend customer rankings response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend customer rankings error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch customer rankings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Customer rankings fetch successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding customer rankings request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer rankings' },
      { status: 500 }
    );
  }
}

