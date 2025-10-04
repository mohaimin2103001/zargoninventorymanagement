/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    console.log('Proxy: Forwarding orders PDF export request to backend')
    
    const backendUrl = `${process.env.API_BASE_URL}/api/export/orders/pdf${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      console.log('Proxy: Backend orders PDF export response status:', response.status)
      const errorText = await response.text()
      console.log('Proxy: Backend orders PDF export error:', errorText)
      return NextResponse.json(
        { error: 'Failed to export orders to PDF' },
        { status: response.status }
      )
    }

    console.log('Proxy: Orders PDF export successful')
    
    // Get the blob from backend
    const blob = await response.blob()
    
    // Forward the response with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename=orders.pdf',
      },
    })
  } catch (error: any) {
    console.error('Proxy: Error forwarding orders PDF export request:', error)
    return NextResponse.json(
      { error: 'Failed to export orders to PDF' },
      { status: 500 }
    )
  }
}

