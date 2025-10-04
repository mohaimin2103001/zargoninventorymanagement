/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consignmentId: string }> }
) {
  try {
    const token = request.headers.get('authorization');
    const { consignmentId } = await params;

    const response = await fetch(`${API_BASE_URL}/api/courier/status/consignment/${consignmentId}`, {
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
    console.error('Courier status consignment proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to get courier status' },
      { status: 500 }
    );
  }
}
