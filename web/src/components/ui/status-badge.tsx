import { OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { className: string }> = {
  'Phone': { className: 'status-phone-v2' },
  'DITC': { className: 'status-ditc-v2' },
  'Phone Off': { className: 'status-cancelled-v2' },
  'PAID': { className: 'status-paid-v2' },
  'Partial Delivered': { className: 'status-partial-v2' },
  'CAN': { className: 'status-cancelled-v2' },
  'HOLD': { className: 'status-hold-v2' },
  'Exchange': { className: 'status-exchange-v2' },
  'PENDING': { className: 'status-pending-v2' }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={`font-bold ${config.className} px-4 py-2 text-sm border-2 rounded-lg shadow-sm`}>
      {status}
    </Badge>
  );
}
