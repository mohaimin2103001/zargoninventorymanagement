/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    console.log('Proxy: Forwarding clear all manual overrides DELETE request to backend');
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/orders/manual-overrides/clear-all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend clear all manual overrides response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend clear all manual overrides error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to clear manual overrides' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Proxy: Clear all manual overrides error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to clear manual overrides' } },
      { status: 500 }
    );
  }
}
