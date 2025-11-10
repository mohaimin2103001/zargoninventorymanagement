import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'staff']).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Inventory schemas
export const sizesSchema = z.object({
  M: z.number().min(0).default(0),
  L: z.number().min(0).default(0),
  XL: z.number().min(0).default(0),
  XXL: z.number().min(0).default(0)
});

export const createInventorySchema = z.object({
  pid: z.number().int().min(0), // Allow 0 for temporary items
  ad: z.string().optional(),
  color: z.string().min(1),
  images: z.array(z.string()).default([]),
  sizes: sizesSchema,
  finalCode: z.string().min(1),
  buyPrice: z.number().min(0), // This is the stock buying price
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  dateAdded: z.union([z.coerce.date(), z.string().transform(val => val ? new Date(val) : new Date())]).optional()
});

export const updateInventorySchema = createInventorySchema.partial();

export const inventoryQuerySchema = z.object({
  finalCode: z.string().transform(val => val || undefined).optional(),
  pid: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  color: z.string().transform(val => val || undefined).optional(),
  description: z.string().transform(val => val || undefined).optional(),
  size: z.string().transform(val => val && ['M', 'L', 'XL', 'XXL'].includes(val) ? val as 'M' | 'L' | 'XL' | 'XXL' : undefined).optional(),
  sizeFilter: z.string().transform(val => val && ['M', 'L', 'XL', 'XXL', 'M_L_XL'].includes(val) ? val as 'M' | 'L' | 'XL' | 'XXL' | 'M_L_XL' : undefined).optional(), // Add support for sizeFilter with M_L_XL option
  qtyGte: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  inStockOnly: z.string().transform(val => val === 'true').optional(),
  zeroStockSizes: z.union([z.string(), z.array(z.string())]).optional(),
  lowStockSizes: z.union([z.string(), z.array(z.string())]).optional(),
  priceGte: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  priceLte: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  page: z.string().transform(val => val ? parseInt(val) : 1).optional(),
  pageSize: z.string().transform(val => val ? parseInt(val) : 20).optional(),
  sort: z.string().optional()
});

// Order schemas
const orderItemSchema = z.object({
  productCode: z.string().min(1),
  size: z.enum(['M', 'L', 'XL', 'XXL']),
  quantity: z.number().int().positive(),
  unitSellingPrice: z.number().min(0)
});

export const createOrderSchema = z.object({
  orderDate: z.string().or(z.date()).optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  items: z.array(orderItemSchema).min(1), // Array of items
  deliveryCharge: z.number().min(0).default(0),
  status: z.enum(['Phone', 'DITC', 'Phone Off', 'PAID', 'Partial Delivered', 'CAN', 'HOLD', 'Exchange', 'PENDING']).default('PENDING'),
  processedDate: z.string().or(z.date()).nullable().optional(),
  pickupDate: z.string().or(z.date()).nullable().optional(),
  reasonNote: z.string().optional()
});

export const updateOrderSchema = z.object({
  orderDate: z.string().or(z.date()).optional(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
  deliveryCharge: z.number().min(0).optional(),
  processedDate: z.string().or(z.date()).nullable().optional(),
  pickupDate: z.string().or(z.date()).nullable().optional(),
  reasonNote: z.string().optional(),
  // Courier fields
  courierConsignmentId: z.number().or(z.string().transform(val => parseInt(val))).optional(),
  courierTrackingCode: z.string().optional(),
  courierInvoice: z.string().optional(),
  courierStatus: z.enum(['pending', 'sent', 'in_transit', 'delivered', 'cancelled', 'failed']).optional(),
  courierSentAt: z.string().or(z.date()).optional(),
  courierDeliveredAt: z.string().or(z.date()).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Phone', 'DITC', 'Phone Off', 'PAID', 'Partial Delivered', 'CAN', 'HOLD', 'Exchange', 'PENDING']),
  reasonNote: z.string().optional(),
  processedDate: z.string().or(z.date()).optional()
});

export const orderQuerySchema = z.object({
  qName: z.string().optional(),
  qAddress: z.string().optional(),
  phone: z.string().optional(),
  code: z.string().optional(),
  consignmentId: z.string().optional(),
  reason: z.string().optional(),
  size: z.enum(['M', 'L', 'XL', 'XXL']).optional(),
  status: z.string().optional(), // Can be comma-separated for multi-select
  qtyEq: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  qtyGte: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  qtyLte: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceGte: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  priceLte: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  hasReason: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  sort: z.string().optional(),
  page: z.string().transform(val => val ? parseInt(val) : 1).optional(),
  pageSize: z.string().transform(val => val ? parseInt(val) : 20).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
