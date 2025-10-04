import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();
    const { id } = await params;
    
    console.log('Proxy: Forwarding inventory PATCH request to backend for ID:', id);
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/inventory/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend inventory PATCH response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend inventory PATCH error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to update inventory item' } },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy: Inventory PATCH successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding inventory PATCH request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization');
    const { id } = await params;
    
    console.log('Proxy: Forwarding inventory DELETE request to backend for ID:', id);
    
    const response = await fetch(`${process.env.API_BASE_URL}/api/inventory/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    console.log('Proxy: Backend inventory DELETE response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend inventory DELETE error:', errorText);
      return NextResponse.json(
        { error: { message: 'Failed to delete inventory item' } },
        { status: response.status }
      );
    }

    if (response.status === 204) {
      console.log('Proxy: Inventory DELETE successful (no content)');
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    console.log('Proxy: Inventory DELETE successful');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy: Error forwarding inventory DELETE request:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
