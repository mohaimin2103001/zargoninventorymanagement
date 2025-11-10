/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HydrationSafe } from '@/components/ui/hydration-safe';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package,
  Target,
  Trophy,
  Download,
  Calculator,
  Calendar,
  Filter,
  Info,
  Activity,
  Percent
} from 'lucide-react';
import AboutDeveloper from '@/components/ui/about-developer';

interface ABCAnalysis {
  summary: { A: number; B: number; C: number };
  products: Array<{
    _id: string;
    totalRevenue: number;
    totalQuantitySold: number;
    orderCount: number;
    classification: 'A' | 'B' | 'C';
    revenuePercentage: string;
  }>;
}

interface DemandForecast {
  forecasts: Array<{
    productCode: string;
    currentAvgDaily: number;
    forecastedDemand: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: 'high' | 'medium' | 'low';
  }>;
  summary: {
    totalProducts: number;
    increasingTrend: number;
    decreasingTrend: number;
    stableTrend: number;
  };
}

interface CustomerAnalytics {
  overview: {
    totalCustomers: number;
    vipCustomers: number;
    loyalCustomers: number;
    recentActiveCustomers: number;
    avgCustomerValue: number;
  };
  topCustomers: Array<{
    _id: { name: string; phone: string; address: string };
    totalOrders: number;
    totalSpent: number;
    totalRevenue: number;
  }>;
  insights: {
    repeatCustomerRate: number;
    vipContribution: number;
    topGeographicArea: string;
  };
  geographicAnalysis: Array<{
    division: string;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>;
}

interface FinancialAnalytics {
  profitability: {
    products: Array<{
      productCode: string;
      totalRevenue: number;
      totalProfit: number;
      profitMargin: number;
      avgProfitPerUnit: number;
      stockValue: number;
      deliveryCharges: number;
      netRevenue: number;
    }>;
    summary: {
      mostProfitable: any;
      highestMargin: any;
      totalProfit: number;
      avgProfitMargin: number;
      totalStockValue: number;
      totalDeliveryCharges: number;
      netTotalRevenue: number;
      currentMonthGrowth: number;
      grossMargin: number;
      operatingMargin: number;
      returnOnInvestment: number;
      inventoryTurnover: number;
      daysInInventory: number;
      currentRatio: number;
      quickRatio: number;
      debtToEquity: number;
      assetTurnover: number;
      workingCapital: number;
    };
  };
  insights: {
    avgProfitMargin: number;
    currentMonthGrowth: number;
    topPerformingCategory: string;
    profitabilityTrend: 'increasing' | 'decreasing' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
    liquidityScore: number;
    efficiencyScore: number;
    profitabilityScore: number;
  };
}

interface TimeFilter {
  startDate: string;
  endDate: string;
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export default function AdvancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'abc' | 'forecast' | 'customer' | 'financial' | 'liquidity'>('financial');
  const [loading, setLoading] = useState(false);
  const [abcData, setAbcData] = useState<ABCAnalysis | null>(null);
  const [forecastData, setForecastData] = useState<DemandForecast | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null);
  const [financialData, setFinancialData] = useState<FinancialAnalytics | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'month'
  });
  const [showCalculations, setShowCalculations] = useState(false);

  const fetchData = useCallback(async (type: string, filters?: TimeFilter) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (filters) {
        queryParams.append('startDate', filters.startDate);
        queryParams.append('endDate', filters.endDate);
        queryParams.append('period', filters.period);
      }
      
      const response = await fetch(`/api/analytics/${type}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        switch (type) {
          case 'abc-analysis':
            setAbcData(data);
            break;
          case 'demand-forecast':
            setForecastData(data);
            break;
          case 'customer-analytics':
            setCustomerData(data);
            break;
          case 'financial-analytics':
            setFinancialData(data);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData('financial-analytics', timeFilter);
  }, [fetchData, timeFilter]);

  const handleTabChange = (tab: 'abc' | 'forecast' | 'customer' | 'financial' | 'liquidity') => {
    setActiveTab(tab);
    const apiMap = {
      abc: 'abc-analysis',
      forecast: 'demand-forecast',
      customer: 'customer-analytics',
      financial: 'financial-analytics',
      liquidity: 'financial-analytics'
    };
    
    fetchData(apiMap[tab], timeFilter);
  };

  const handleTimeFilterChange = (newFilter: Partial<TimeFilter>) => {
    const updatedFilter = { ...timeFilter, ...newFilter };
    setTimeFilter(updatedFilter);
    
    const apiMap = {
      abc: 'abc-analysis',
      forecast: 'demand-forecast',
      customer: 'customer-analytics',
      financial: 'financial-analytics',
      liquidity: 'financial-analytics'
    };
    
    fetchData(apiMap[activeTab], updatedFilter);
  };

  const exportToPDF = async (sectionName: string) => {
    try {
      const element = document.getElementById(`${sectionName}-section`);
      if (!element) {
        console.error('Section not found:', `${sectionName}-section`);
        alert('Section not found for export. Please make sure the content is loaded.');
        return;
      }

      // Show loading state
      const button = document.querySelector(`button[data-export="${sectionName}"]`) as HTMLElement;
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Exporting...';
        button.style.pointerEvents = 'none';
        
        try {
          // Use dynamic imports to avoid SSR issues
          const jsPDF = (await import('jspdf')).jsPDF;
          const html2canvas = (await import('html2canvas')).default;
          
          // Create canvas from element with better options
          const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            removeContainer: true,
            imageTimeout: 0,
            height: element.scrollHeight,
            width: element.scrollWidth
          });
          
          const imgData = canvas.toDataURL('image/png', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          // Calculate dimensions
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = 0;
          
          // Add header to first page
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Analytics Report', 20, 20);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 28);
          
          // Add the main content
          pdf.addImage(imgData, 'PNG', 0, 35, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - 35);
          
          // Add additional pages if needed
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
          
          // Save the PDF
          const fileName = `Analytics_${sectionName}_${new Date().toISOString().split('T')[0]}.pdf`;
          pdf.save(fileName);
          
          // Show success message
          setTimeout(() => {
            alert('✅ PDF exported successfully!');
          }, 100);
          
        } finally {
          // Reset button after a delay
          setTimeout(() => {
            if (button) {
              button.innerHTML = originalText;
              button.style.pointerEvents = 'auto';
            }
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('❌ PDF export failed. Error: ' + (error as Error).message);
      
      // Reset button in case of error
      const button = document.querySelector(`button[data-export="${sectionName}"]`) as HTMLElement;
      if (button) {
        button.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Export PDF';
        button.style.pointerEvents = 'auto';
      }
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'C': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <span className="w-4 h-4 inline-block bg-gray-400 rounded"></span>;
    }
  };

  const CalculationFormulas = ({ section }: { section: string }) => {
    const getVariableValues = () => {
      if (section === 'financial' && financialData?.profitability) {
        const summary = financialData.profitability.summary;
        return {
          totalRevenue: summary?.netTotalRevenue || 0,
          totalDeliveryCharges: summary?.totalDeliveryCharges || 0,
          totalStockValue: summary?.totalStockValue || 0,
          totalProfit: summary?.totalProfit || 0,
          avgProfitMargin: summary?.avgProfitMargin || 0,
          currentRatio: summary?.currentRatio || 0,
          inventoryTurnover: summary?.inventoryTurnover || 0,
          workingCapital: summary?.workingCapital || 0,
          roi: summary?.returnOnInvestment || 0
        };
      }
      return {
        totalRevenue: 0,
        totalDeliveryCharges: 0,
        totalStockValue: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        currentRatio: 0,
        inventoryTurnover: 0,
        workingCapital: 0,
        roi: 0
      };
    };

    const variables = getVariableValues();

    const formulas = {
      financial: [
        { 
          label: "Net Revenue", 
          formula: "Total Revenue - Delivery Charges", 
          calculation: `৳${(variables.totalRevenue + (variables.totalDeliveryCharges || 0)).toLocaleString()} - ৳${(variables.totalDeliveryCharges || 0).toLocaleString()} = ৳${variables.totalRevenue.toLocaleString()}`,
          description: "Revenue after deducting delivery costs",
          variables: {
            "Total Revenue": `৳${(variables.totalRevenue + (variables.totalDeliveryCharges || 0)).toLocaleString()}`,
            "Delivery Charges": `৳${(variables.totalDeliveryCharges || 0).toLocaleString()}`,
            "Result": `৳${variables.totalRevenue.toLocaleString()}`
          }
        },
        { 
          label: "Profit Calculation", 
          formula: "Net Revenue - Total Cost", 
          calculation: `৳${variables.totalRevenue.toLocaleString()} - ৳${(variables.totalStockValue * 0.7).toLocaleString()} = ৳${variables.totalProfit.toLocaleString()}`,
          description: "Basic profit calculation (Cost = 70% of stock value)",
          variables: {
            "Net Revenue": `৳${variables.totalRevenue.toLocaleString()}`,
            "Total Cost (70% of stock)": `৳${(variables.totalStockValue * 0.7).toLocaleString()}`,
            "Result": `৳${variables.totalProfit.toLocaleString()}`
          }
        },
        { 
          label: "Profit Margin", 
          formula: "(Total Profit / Net Revenue) × 100", 
          calculation: `(৳${variables.totalProfit.toLocaleString()} / ৳${variables.totalRevenue.toLocaleString()}) × 100 = ${variables.avgProfitMargin.toFixed(1)}%`,
          description: "Percentage of profit per sale",
          variables: {
            "Total Profit": `৳${variables.totalProfit.toLocaleString()}`,
            "Net Revenue": `৳${variables.totalRevenue.toLocaleString()}`,
            "Result": `${variables.avgProfitMargin.toFixed(1)}%`
          }
        },
        { 
          label: "Current Ratio", 
          formula: "Current Assets / Current Liabilities", 
          calculation: `৳${(variables.totalStockValue + variables.totalRevenue * 0.1).toLocaleString()} / ৳${(variables.totalRevenue * 0.05).toLocaleString()} = ${variables.currentRatio.toFixed(2)}`,
          description: "Short-term liquidity measure",
          variables: {
            "Current Assets (Stock + 10% Cash)": `৳${(variables.totalStockValue + variables.totalRevenue * 0.1).toLocaleString()}`,
            "Current Liabilities (5% of Revenue)": `৳${(variables.totalRevenue * 0.05).toLocaleString()}`,
            "Result": `${variables.currentRatio.toFixed(2)}`
          }
        },
        { 
          label: "Inventory Turnover", 
          formula: "COGS / Average Inventory", 
          calculation: `৳${(variables.totalStockValue * 0.7).toLocaleString()} / ৳${variables.totalStockValue.toLocaleString()} = ${variables.inventoryTurnover.toFixed(1)}x`,
          description: "How quickly inventory is sold",
          variables: {
            "COGS (70% of stock value)": `৳${(variables.totalStockValue * 0.7).toLocaleString()}`,
            "Average Inventory": `৳${variables.totalStockValue.toLocaleString()}`,
            "Result": `${variables.inventoryTurnover.toFixed(1)}x`
          }
        },
        { 
          label: "Return on Investment (ROI)", 
          formula: "(Net Profit / Total Investment) × 100", 
          calculation: `(৳${variables.totalProfit.toLocaleString()} / ৳${variables.totalStockValue.toLocaleString()}) × 100 = ${variables.roi.toFixed(1)}%`,
          description: "Return on investment percentage",
          variables: {
            "Net Profit": `৳${variables.totalProfit.toLocaleString()}`,
            "Total Investment (Stock Value)": `৳${variables.totalStockValue.toLocaleString()}`,
            "Result": `${variables.roi.toFixed(1)}%`
          }
        },
        { 
          label: "Working Capital", 
          formula: "Current Assets - Current Liabilities", 
          calculation: `৳${(variables.totalStockValue + variables.totalRevenue * 0.1).toLocaleString()} - ৳${(variables.totalRevenue * 0.05).toLocaleString()} = ৳${variables.workingCapital.toLocaleString()}`,
          description: "Available short-term capital",
          variables: {
            "Current Assets": `৳${(variables.totalStockValue + variables.totalRevenue * 0.1).toLocaleString()}`,
            "Current Liabilities": `৳${(variables.totalRevenue * 0.05).toLocaleString()}`,
            "Result": `৳${variables.workingCapital.toLocaleString()}`
          }
        }
      ],
      abc: [
        { 
          label: "Revenue Classification", 
          formula: "Cumulative Revenue % ≤ 80% = A, ≤ 95% = B, > 95% = C", 
          calculation: "Sort products by revenue → Calculate cumulative % → Classify",
          description: "80/15/5 rule for product classification",
          variables: {
            "Class A Products": "Top 80% of revenue contributors",
            "Class B Products": "Next 15% of revenue contributors", 
            "Class C Products": "Bottom 5% of revenue contributors"
          }
        },
        { 
          label: "Revenue Percentage", 
          formula: "(Product Revenue / Total Revenue) × 100", 
          calculation: "Individual product contribution to total sales",
          description: "Individual product contribution",
          variables: {
            "Product Revenue": "Total sales for specific product",
            "Total Revenue": "Sum of all product sales",
            "Result": "Percentage contribution"
          }
        }
      ],
      forecast: [
        { 
          label: "Daily Average", 
          formula: "Total Sales / Number of Days", 
          calculation: "Historical sales data averaged per day",
          description: "Average daily sales volume",
          variables: {
            "Total Sales": "Sum of all sales in period",
            "Number of Days": "Days in analysis period",
            "Result": "Average daily sales"
          }
        },
        { 
          label: "30-Day Forecast", 
          formula: "Daily Average × 30 × Trend Factor", 
          calculation: "Projected sales based on historical trends",
          description: "Predicted sales for next 30 days",
          variables: {
            "Daily Average": "Historical daily sales average",
            "Trend Factor": "Growth/decline multiplier",
            "Result": "30-day sales prediction"
          }
        }
      ],
      customer: [
        { 
          label: "Customer Lifetime Value", 
          formula: "Average Order Value × Purchase Frequency × Customer Lifespan", 
          calculation: "Total expected revenue from customer relationship",
          description: "Total value of customer relationship",
          variables: {
            "Average Order Value": "Mean order amount per customer",
            "Purchase Frequency": "Orders per time period",
            "Customer Lifespan": "Expected relationship duration"
          }
        }
      ]
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Detailed Calculation Formulas - {section.toUpperCase()}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCalculations(!showCalculations)}
            >
              {showCalculations ? 'Hide' : 'Show'} Details
            </Button>
          </CardTitle>
        </CardHeader>
        {showCalculations && (
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              {formulas[section as keyof typeof formulas]?.map((formula, index) => (
                <div key={index} className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <div className="font-bold text-lg text-blue-800 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    {formula.label}
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Formula:</div>
                    <div className="font-mono text-lg bg-white p-3 rounded border border-blue-300 text-blue-900">
                      {formula.formula}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Calculation with Current Values:</div>
                    <div className="font-mono text-md bg-green-50 p-3 rounded border border-green-300 text-green-800">
                      {formula.calculation}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Variable Breakdown:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(formula.variables).map(([key, value], idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-300">
                          <div className="text-xs font-medium text-gray-600">{key}:</div>
                          <div className="font-semibold text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-300">
                    <strong>Explanation:</strong> {formula.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const TimeFilterControls = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Time Period Filter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year', 'custom'].map((period) => (
              <Button
                key={period}
                variant={timeFilter.period === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const now = new Date();
                  let startDate = new Date();
                  
                  switch (period) {
                    case 'week':
                      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      break;
                    case 'month':
                      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      break;
                    case 'quarter':
                      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                      break;
                    case 'year':
                      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                      break;
                  }
                  
                  if (period !== 'custom') {
                    handleTimeFilterChange({
                      period: period as any,
                      startDate: startDate.toISOString().split('T')[0],
                      endDate: now.toISOString().split('T')[0]
                    });
                  } else {
                    handleTimeFilterChange({ period: 'custom' });
                  }
                }}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
          
          {timeFilter.period === 'custom' && (
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={timeFilter.startDate}
                onChange={(e) => handleTimeFilterChange({ startDate: e.target.value })}
                className="w-40"
              />
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={timeFilter.endDate}
                onChange={(e) => handleTimeFilterChange({ endDate: e.target.value })}
                className="w-40"
              />
            </div>
          )}
          
          <Button
            onClick={() => handleTimeFilterChange({})}
            variant="outline"
            size="sm"
            className="ml-auto text-hover-scale"
          >
            <Download className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <HydrationSafe className="space-y-6">
      <HydrationSafe className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 ecommerce-header">Advanced Analytics Dashboard</h1>
        <HydrationSafe className="text-sm text-gray-500 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {timeFilter.startDate} to {timeFilter.endDate}
        </HydrationSafe>
      </HydrationSafe>

      {/* Time Filter Controls */}
      <TimeFilterControls />

      {/* Tab Navigation */}
      <HydrationSafe className="flex space-x-4 border-b">
        <button
          onClick={() => handleTabChange('financial')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ecommerce-nav-item ${
            activeTab === 'financial'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          Financial Analytics
        </button>
        <button
          onClick={() => handleTabChange('abc')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ecommerce-nav-item ${
            activeTab === 'abc'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          ABC Analysis
        </button>
        <button
          onClick={() => handleTabChange('forecast')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ecommerce-nav-item ${
            activeTab === 'forecast'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Demand Forecast
        </button>
        <button
          onClick={() => handleTabChange('customer')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ecommerce-nav-item ${
            activeTab === 'customer'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Customer Analytics
        </button>
        <button
          onClick={() => window.location.href = '/dashboard/customer-rankings'}
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Customer Rankings
        </button>
      </HydrationSafe>

      {loading && (
        <HydrationSafe className="text-center py-12">
          <HydrationSafe className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900">{''}</HydrationSafe>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </HydrationSafe>
      )}

      {/* ABC Analysis Tab */}
      {activeTab === 'abc' && abcData && abcData.summary && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-green-50 border-green-200 ecommerce-card">
              <CardHeader>
                <CardTitle className="text-green-800 ecommerce-header">Class A Products</CardTitle>
                <p className="text-sm text-green-600">Top revenue generators (80% rule)</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{abcData.summary.A || 0}</div>
                <p className="text-sm text-green-700">Focus on these star performers</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800">Class B Products</CardTitle>
                <p className="text-sm text-yellow-600">Steady performers</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">{abcData.summary.B || 0}</div>
                <p className="text-sm text-yellow-700">Maintain current strategy</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Class C Products</CardTitle>
                <p className="text-sm text-red-600">Slow movers - needs attention</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{abcData.summary.C || 0}</div>
                <p className="text-sm text-red-700">Consider bundling or discounts</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Classification Analysis</CardTitle>
              <p className="text-sm text-gray-600">Products ranked by revenue contribution</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Quantity Sold</TableHead>
                    <TableHead>Revenue %</TableHead>
                    <TableHead>Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abcData.products && abcData.products.slice(0, 20).map((product, index) => (
                    <TableRow key={`abc-${product._id}-${index}`}>
                      <TableCell className="font-mono">{product._id}</TableCell>
                      <TableCell>
                        <Badge className={`${getClassificationColor(product.classification)} border`}>
                          Class {product.classification}
                        </Badge>
                      </TableCell>
                      <TableCell>৳{(product.totalRevenue || 0).toLocaleString()}</TableCell>
                      <TableCell>{product.totalQuantitySold}</TableCell>
                      <TableCell>{product.revenuePercentage}%</TableCell>
                      <TableCell>{product.orderCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Demand Forecast Tab */}
      {activeTab === 'forecast' && forecastData && forecastData.summary && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{forecastData.summary.totalProducts || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Growing Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">
                  {forecastData.summary.increasingTrend || 0}
                </div>
                <p className="text-sm text-green-700">Stock up on these!</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Declining Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">
                  {forecastData.summary.decreasingTrend || 0}
                </div>
                <p className="text-sm text-red-700">Consider promotions</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-gray-800">Stable Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {forecastData.summary.stableTrend || 0}
                </div>
                <p className="text-sm text-gray-700">Maintain inventory</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>30-Day Demand Forecast</CardTitle>
              <p className="text-sm text-gray-600">Predicted sales based on historical patterns</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Current Daily Avg</TableHead>
                    <TableHead>30-Day Forecast</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Action Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.forecasts && forecastData.forecasts.slice(0, 15).map((forecast, index) => (
                    <TableRow key={`forecast-${forecast.productCode}-${index}`}>
                      <TableCell className="font-mono">{forecast.productCode}</TableCell>
                      <TableCell>{forecast.currentAvgDaily}</TableCell>
                      <TableCell className="font-semibold">{forecast.forecastedDemand}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(forecast.trend)}
                          <span className="capitalize">{forecast.trend}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${
                            forecast.confidence === 'high' 
                              ? 'bg-green-100 text-green-800' 
                              : forecast.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          } border`}
                        >
                          {forecast.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {forecast.trend === 'increasing' && (
                          <span className="text-green-600 text-sm">📈 Stock up!</span>
                        )}
                        {forecast.trend === 'decreasing' && (
                          <span className="text-red-600 text-sm">📉 Promote/Discount</span>
                        )}
                        {forecast.trend === 'stable' && (
                          <span className="text-gray-600 text-sm">➡️ Maintain</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Analytics Tab */}
      {activeTab === 'customer' && customerData && customerData.overview && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{customerData.overview.totalCustomers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-800">VIP Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">
                  {customerData.overview.vipCustomers || 0}
                </div>
                <p className="text-sm text-purple-700">Spend &gt;₹5,000</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Loyal Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">
                  {customerData.overview.loyalCustomers || 0}
                </div>
                <p className="text-sm text-blue-700">3+ orders</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Recent Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">
                  {customerData.overview.recentActiveCustomers || 0}
                </div>
                <p className="text-sm text-green-700">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Avg Customer Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-900">
                  ৳{(customerData.overview.avgCustomerValue || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Division-wise Customer Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Bangladesh Division-wise Customer Distribution</CardTitle>
              <p className="text-sm text-gray-600">Customer count by major divisions</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {customerData.geographicAnalysis && customerData.geographicAnalysis.map((division, index) => (
                  <div key={`geo-${division.division}-${index}`} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{division.totalCustomers}</div>
                      <div className="text-sm font-medium text-blue-700">{division.division}</div>
                      <div className="text-xs text-blue-600">
                        ৳{(division.totalRevenue || 0).toLocaleString()} revenue
                      </div>
                      <div className="text-xs text-gray-500">
                        {division.totalOrders} orders
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!customerData.geographicAnalysis || customerData.geographicAnalysis.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No geographic data available</p>
                  <p className="text-sm">Customer location data will appear here as orders are processed</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Repeat Customer Rate:</span>
                  <span className="font-semibold">{customerData.insights?.repeatCustomerRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>VIP Revenue Contribution:</span>
                  <span className="font-semibold">{customerData.insights?.vipContribution || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Top Geographic Area:</span>
                  <span className="font-semibold">{customerData.insights?.topGeographicArea || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerData.topCustomers && customerData.topCustomers.slice(0, 10).map((customer, index) => (
                      <TableRow key={`customer-${customer._id.phone}-${index}`}>
                        <TableCell className="font-medium">{customer._id.name || 'N/A'}</TableCell>
                        <TableCell className="font-mono">{customer._id.phone}</TableCell>
                        <TableCell>{customer.totalOrders}</TableCell>
                        <TableCell>৳{(customer.totalSpent || 0).toLocaleString()}</TableCell>
                        <TableCell>৳{(customer.totalRevenue || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Financial Analytics Tab */}
      {activeTab === 'financial' && (
        <div id="financial-section" className="space-y-6">
          <CalculationFormulas section="financial" />
          
          {financialData && financialData.insights && financialData.profitability && !loading && (
            <>
              {/* Key Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card className="bg-green-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-green-800 text-sm font-medium">Avg Profit Margin</CardTitle>
                    <Percent className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">
                      {financialData.insights.avgProfitMargin || 0}%
                    </div>
                    <p className="text-xs text-green-700">Across all products</p>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      (Net Revenue - Cost) / Net Revenue × 100
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-blue-800 text-sm font-medium">Month Growth</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">
                      {(financialData.profitability.summary.currentMonthGrowth || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-blue-700">Month-over-month</p>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      ((Current - Previous) / Previous) × 100
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-purple-800 text-sm font-medium">Total Profit</CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">
                      ৳{(financialData.profitability.summary?.totalProfit || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-purple-700">All-time profits</p>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      Stock Value - Order Value
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-yellow-800 text-sm font-medium">Net Revenue</CardTitle>
                    <Activity className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-900">
                      ৳{(financialData.profitability.summary?.netTotalRevenue || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-yellow-700">After delivery charges</p>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      Total Revenue - Delivery Charges
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-orange-800 text-sm font-medium">ROI</CardTitle>
                    <Target className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-900">
                      {(financialData.profitability.summary?.returnOnInvestment || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-orange-700">Return on Investment</p>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      (Net Profit / Total Investment) × 100
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Financial Ratios */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Liquidity Ratios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Current Ratio:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.currentRatio || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Quick Ratio:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.quickRatio || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Working Capital:</span>
                      <span className="font-semibold">৳{(financialData.profitability.summary?.workingCapital || 0).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Efficiency Ratios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Inventory Turnover:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.inventoryTurnover || 0).toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Days in Inventory:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.daysInInventory || 0).toFixed(0)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Asset Turnover:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.assetTurnover || 0).toFixed(2)}x</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Profitability Ratios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Margin:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.grossMargin || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Operating Margin:</span>
                      <span className="font-semibold">{(financialData.profitability.summary?.operatingMargin || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Net Margin:</span>
                      <span className="font-semibold">{financialData.insights.avgProfitMargin || 0}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Risk Level:</span>
                      <Badge variant={financialData.insights.riskLevel === 'low' ? 'default' : 
                                    financialData.insights.riskLevel === 'medium' ? 'secondary' : 'destructive'}>
                        {financialData.insights.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Liquidity Score:</span>
                      <span className="font-semibold">{(financialData.insights.liquidityScore || 0)}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Efficiency Score:</span>
                      <span className="font-semibold">{(financialData.insights.efficiencyScore || 0)}/100</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Calculation Breakdown */}
              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <Calculator className="w-6 h-6" />
                    How We Calculate These Ratios - Step by Step
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Ratio Explanation */}
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                      <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">1</span>
                        Current Ratio: {(financialData.profitability.summary?.currentRatio || 0).toFixed(2)}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="font-mono bg-gray-100 p-2 rounded">Current Assets / Current Liabilities</div>
                        <div className="space-y-1">
                          <div><strong>Current Assets:</strong></div>
                          <div className="ml-4">• Stock Value: ৳{(financialData.profitability.summary?.totalStockValue || 0).toLocaleString()}</div>
                          <div className="ml-4">• Cash (10% of revenue): ৳{((financialData.profitability.summary?.netTotalRevenue || 0) * 0.1).toLocaleString()}</div>
                          <div className="ml-4 border-t pt-1"><strong>Total: ৳{((financialData.profitability.summary?.totalStockValue || 0) + ((financialData.profitability.summary?.netTotalRevenue || 0) * 0.1)).toLocaleString()}</strong></div>
                        </div>
                        <div className="space-y-1">
                          <div><strong>Current Liabilities:</strong></div>
                          <div className="ml-4">• Estimated payables (5% of revenue): ৳{((financialData.profitability.summary?.netTotalRevenue || 0) * 0.05).toLocaleString()}</div>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <strong>Result: {(financialData.profitability.summary?.currentRatio || 0).toFixed(2)}</strong>
                          <div className="text-xs text-gray-600">Higher is better (&gt;2.0 = excellent liquidity)</div>
                        </div>
                      </div>
                    </div>

                    {/* Inventory Turnover Explanation */}
                    <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">2</span>
                        Inventory Turnover: {(financialData.profitability.summary?.inventoryTurnover || 0).toFixed(1)}x
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="font-mono bg-gray-100 p-2 rounded">COGS / Average Inventory</div>
                        <div className="space-y-1">
                          <div><strong>COGS (Cost of Goods Sold):</strong></div>
                          <div className="ml-4">• 70% of stock value: ৳{((financialData.profitability.summary?.totalStockValue || 0) * 0.7).toLocaleString()}</div>
                        </div>
                        <div className="space-y-1">
                          <div><strong>Average Inventory:</strong></div>
                          <div className="ml-4">• Current stock value: ৳{(financialData.profitability.summary?.totalStockValue || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <strong>Result: {(financialData.profitability.summary?.inventoryTurnover || 0).toFixed(1)}x</strong>
                          <div className="text-xs text-gray-600">Days to sell inventory: {(financialData.profitability.summary?.daysInInventory || 0).toFixed(0)} days</div>
                        </div>
                      </div>
                    </div>

                    {/* Gross Margin Explanation */}
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                      <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm">3</span>
                        Gross Margin: {(financialData.profitability.summary?.grossMargin || 0).toFixed(1)}%
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="font-mono bg-gray-100 p-2 rounded">(Revenue - COGS) / Revenue × 100</div>
                        <div className="space-y-1">
                          <div><strong>Revenue:</strong> ৳{(financialData.profitability.summary?.netTotalRevenue || 0).toLocaleString()}</div>
                          <div><strong>COGS:</strong> ৳{((financialData.profitability.summary?.totalStockValue || 0) * 0.7).toLocaleString()}</div>
                          <div><strong>Gross Profit:</strong> ৳{((financialData.profitability.summary?.netTotalRevenue || 0) - ((financialData.profitability.summary?.totalStockValue || 0) * 0.7)).toLocaleString()}</div>
                        </div>
                        <div className="bg-purple-100 p-2 rounded">
                          <strong>Result: {(financialData.profitability.summary?.grossMargin || 0).toFixed(1)}%</strong>
                          <div className="text-xs text-gray-600">Shows profitability before operating expenses</div>
                        </div>
                      </div>
                    </div>

                    {/* Working Capital Explanation */}
                    <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
                      <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                        <span className="bg-orange-600 text-white px-2 py-1 rounded text-sm">4</span>
                        Working Capital: ৳{(financialData.profitability.summary?.workingCapital || 0).toLocaleString()}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="font-mono bg-gray-100 p-2 rounded">Current Assets - Current Liabilities</div>
                        <div className="space-y-1">
                          <div><strong>Current Assets:</strong> ৳{((financialData.profitability.summary?.totalStockValue || 0) + ((financialData.profitability.summary?.netTotalRevenue || 0) * 0.1)).toLocaleString()}</div>
                          <div><strong>Current Liabilities:</strong> ৳{((financialData.profitability.summary?.netTotalRevenue || 0) * 0.05).toLocaleString()}</div>
                        </div>
                        <div className="bg-orange-100 p-2 rounded">
                          <strong>Result: ৳{(financialData.profitability.summary?.workingCapital || 0).toLocaleString()}</strong>
                          <div className="text-xs text-gray-600">Available money for day-to-day operations</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <h5 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Key Assumptions Used in Calculations:
                    </h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Cost of Goods Sold (COGS):</strong> Estimated as 70% of stock value</li>
                      <li>• <strong>Cash Assets:</strong> Estimated as 10% of total revenue</li>
                      <li>• <strong>Current Liabilities:</strong> Estimated as 5% of total revenue (accounts payable)</li>
                      <li>• <strong>Operating Expenses:</strong> Estimated as 10% of total revenue</li>
                      <li>• <strong>Stock Valuation:</strong> Based on current inventory at sell prices</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <div className="flex justify-end gap-2 mb-4">
                <Button 
                  onClick={() => exportToPDF('financial')} 
                  variant="outline" 
                  size="sm"
                  data-export="financial"
                  className="ecommerce-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>

              {/* Product Profitability Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Profitability Analysis</CardTitle>
                  <p className="text-sm text-gray-600">Understanding which products make the most money</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Code</TableHead>
                          <TableHead>Net Revenue</TableHead>
                          <TableHead>Stock Value</TableHead>
                          <TableHead>Delivery Charges</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Profit Margin</TableHead>
                          <TableHead>Profit per Unit</TableHead>
                          <TableHead>Strategy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData.profitability.products.map((product) => (
                          <TableRow key={product.productCode}>
                            <TableCell className="font-medium">{product.productCode}</TableCell>
                            <TableCell>৳{(product.netRevenue || 0).toLocaleString()}</TableCell>
                            <TableCell>৳{(product.stockValue || 0).toLocaleString()}</TableCell>
                            <TableCell>৳{(product.deliveryCharges || 0).toLocaleString()}</TableCell>
                            <TableCell className={product.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ৳{product.totalProfit.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.profitMargin >= 20 ? 'default' : 
                                           product.profitMargin >= 10 ? 'secondary' : 'destructive'}>
                                {product.profitMargin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>৳{product.avgProfitPerUnit.toFixed(2)}</TableCell>
                            <TableCell>
                              {product.profitMargin >= 20 ? 
                                <Badge className="bg-green-100 text-green-800">📈 Optimize</Badge> :
                                product.profitMargin >= 10 ?
                                <Badge className="bg-yellow-100 text-yellow-800">⚖️ Monitor</Badge> :
                                <Badge className="bg-red-100 text-red-800">🔍 Review</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      )}

      {/* About Developer Section */}
      <AboutDeveloper />
    </HydrationSafe>
  );
}
