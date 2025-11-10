import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    
    console.log('Analytics proxy - Type:', resolvedParams.type);
    console.log('Analytics proxy - API_BASE_URL:', API_BASE_URL);
    console.log('Analytics proxy - Auth header present:', !!authHeader);
    
    // Build query string
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/analytics/${resolvedParams.type}${queryString ? `?${queryString}` : ''}`;
    
    console.log('Analytics proxy - Full URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('Analytics proxy - Response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    console.log('Analytics proxy - Content-Type:', contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analytics proxy - Error response:', errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
