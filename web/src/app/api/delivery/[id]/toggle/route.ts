import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id - this is required in Next.js 15
    const { id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('Delivery toggle API proxy called:', { id, body, hasToken: !!token });
    
    const response = await fetch(`${API_BASE_URL}/api/delivery/${id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error response:', errorData);
      return NextResponse.json(
        { error: 'Failed to toggle delivery selection', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend success response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Delivery toggle API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
