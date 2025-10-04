/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoice: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const { invoice } = await params;

    const response = await fetch(`${API_BASE_URL}/api/courier/status/invoice/${invoice}`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Courier status invoice proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get courier status' },
      { status: 500 }
    );
  }
}
