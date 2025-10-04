import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    const response = await fetch(`${API_BASE_URL}/api/delivery/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to export delivery voucher' },
        { status: response.status }
      );
    }

    // Handle different response types
    if (format === 'excel') {
      const buffer = await response.arrayBuffer();
      const headers = new Headers();
      
      // Copy headers from backend response
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        headers.set('content-disposition', contentDisposition);
      }
      headers.set('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      return new NextResponse(buffer, { headers });
    } else if (format === 'csv') {
      const csvData = await response.text();
      const headers = new Headers();
      
      // Copy headers from backend response
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        headers.set('content-disposition', contentDisposition);
      }
      headers.set('content-type', 'text/csv');
      
      return new NextResponse(csvData, { headers });
    } else {
      // JSON response
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Delivery export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

