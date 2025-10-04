/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Input } from './input'
import { Download, FileText, FileSpreadsheet, Calendar, Filter } from 'lucide-react'

interface ExportControlsProps {
  type: 'inventory' | 'orders'
  onExport?: (filters: ExportFilters) => void
  currentFilters?: any
}

interface ExportFilters {
  dateFrom?: string
  dateTo?: string
  timeRange?: 'week' | 'month' | 'custom'
  format: 'excel' | 'pdf'
  additionalFilters?: any
}

export default function ExportControls({ type, onExport, currentFilters = {} }: ExportControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<ExportFilters>({
    timeRange: 'month',
    format: 'excel'
  })

  // Get date ranges
  const getDateRange = (range: 'week' | 'month' | 'custom') => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    
    switch (range) {
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return {
          dateFrom: weekAgo.toISOString().split('T')[0],
          dateTo: endDate
        }
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        return {
          dateFrom: monthAgo.toISOString().split('T')[0],
          dateTo: endDate
        }
      case 'custom':
        return {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo
        }
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    const dateRange = getDateRange(filters.timeRange || 'month')
    const exportFilters = {
      ...filters,
      ...dateRange,
      format,
      additionalFilters: currentFilters
    }

    // Build query parameters
    const params = new URLSearchParams()
    
    if (exportFilters.dateFrom) params.append('dateFrom', exportFilters.dateFrom)
    if (exportFilters.dateTo) params.append('dateTo', exportFilters.dateTo)
    
    // Add current page filters
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.append(key, value as string)
      }
    })

    // Make authenticated request
    const baseUrl = `/api/export/${type}/${format}`
    const queryString = params.toString()
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl
    
    try {
      // Get the token from localStorage (where the auth context stores it)
      const token = localStorage.getItem('token')
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }
      
      // Get the blob and create download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      
      // Set filename from Content-Disposition header or default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${type}-export.${format === 'excel' ? 'xlsx' : 'pdf'}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      
    } catch (error) {
      console.error('Export error:', error)
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`)
    }
    
    if (onExport) {
      onExport(exportFilters)
    }
  }

  const handleTimeRangeChange = (range: 'week' | 'month' | 'custom') => {
    setFilters(prev => ({ ...prev, timeRange: range }))
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {type === 'inventory' ? 'Stock' : 'Orders'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="h-4 w-4" />
            {isExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            variant="outline"
            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.timeRange === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange('week')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Last Week
                </Button>
                <Button
                  variant={filters.timeRange === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange('month')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Last Month
                </Button>
                <Button
                  variant={filters.timeRange === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange('custom')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Custom Range
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.timeRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Current Filters Display */}
            {Object.keys(currentFilters).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Current Page Filters</label>
                <div className="text-xs text-gray-600 space-y-1">
                  {Object.entries(currentFilters).map(([key, value]) => {
                    if (!value || value === '' || value === 'all') return null;
                    return (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span>{value as string}</span>
                      </div>
                    );
                  })}
                  {Object.keys(currentFilters).every(key => !currentFilters[key] || currentFilters[key] === '' || currentFilters[key] === 'all') && (
                    <span className="text-gray-400">No filters applied</span>
                  )}
                </div>
              </div>
            )}

            {/* Export with Filters */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Filtered Excel
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                variant="outline"
                className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <FileText className="h-4 w-4" />
                Export Filtered PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
