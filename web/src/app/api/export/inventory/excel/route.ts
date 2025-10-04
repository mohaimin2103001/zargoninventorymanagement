/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    console.log('Proxy: Forwarding inventory Excel export request to backend')
    
    const backendUrl = `${process.env.API_BASE_URL}/api/export/inventory/excel${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      console.log('Proxy: Backend inventory Excel export response status:', response.status)
      const errorText = await response.text()
      console.log('Proxy: Backend inventory Excel export error:', errorText)
      return NextResponse.json(
        { error: 'Failed to export inventory to Excel' },
        { status: response.status }
      )
    }

    console.log('Proxy: Inventory Excel export successful')
    
    // Get the blob from backend
    const blob = await response.blob()
    
    // Forward the response with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename=inventory.xlsx',
      },
    })
  } catch (error: any) {
    console.error('Proxy: Error forwarding inventory Excel export request:', error)
    return NextResponse.json(
      { error: 'Failed to export inventory to Excel' },
      { status: 500 }
    )
  }
}

