import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the authorization header
    const authorization = request.headers.get('authorization');
    
    // Get the form data from the request
    const formData = await request.formData();
    
    console.log('Proxy: Forwarding image upload request to backend');
    
    // Forward the request to the backend
    const response = await fetch(`${process.env.API_BASE_URL}/api/inventory/${id}/images`, {
      method: 'POST',
      headers: {
        ...(authorization && { Authorization: authorization }),
      },
      body: formData,
    });

    console.log('Proxy: Backend image upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend image upload error:', errorText);
      return NextResponse.json(
        { error: 'Image upload failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Proxy: Image upload successful');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Proxy: Error forwarding image upload request:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the authorization header
    const authorization = request.headers.get('authorization');
    
    // Get the request body
    const body = await request.json();
    
    console.log('Proxy: Forwarding image delete request to backend');
    
    // Forward the request to the backend
    const response = await fetch(`${process.env.API_BASE_URL}/api/inventory/${id}/images`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization && { Authorization: authorization }),
      },
      body: JSON.stringify(body),
    });

    console.log('Proxy: Backend image delete response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Proxy: Backend image delete error:', errorText);
      return NextResponse.json(
        { error: 'Image delete failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Proxy: Image delete successful');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Proxy: Error forwarding image delete request:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
