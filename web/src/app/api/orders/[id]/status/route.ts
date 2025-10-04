import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();
    const { id } = await params;

    console.log('Proxy: Forwarding order status PATCH request to backend for ID:', id);

    const response = await fetch(`${process.env.API_BASE_URL}/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend order status PATCH response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend order status PATCH error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to update order status' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Order status PATCH successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding order status PATCH request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
