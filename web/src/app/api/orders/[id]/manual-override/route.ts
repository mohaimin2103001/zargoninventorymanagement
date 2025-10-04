/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const { id } = await params;
    
    console.log('Proxy: Forwarding clear manual override DELETE request to backend for order:', id);
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/orders/${id}/manual-override`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend clear manual override response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend clear manual override error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to clear manual override' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Proxy: Clear manual override error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to clear manual override' } },
      { status: 500 }
    );
  }
}
