/** Authentication types */
export interface AuthUser {
  authenticated: boolean;
  username: string;
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

/** Customer as returned by the FastAPI backend. */
export interface Customer {
  customer_id: string;
  name: string;
  mobile: string;
  alternate_mobile: string;
  address: string;
  area: string;
  ro_brand: string;
  ro_model: string;
  installation_date: string | null;
  technician: string;
  notes: string;
  created_at: string;
}

/** Fields the user fills in when creating or editing a customer. */
export interface CustomerFormData {
  name: string;
  mobile: string;
  alternate_mobile: string;
  address: string;
  area: string;
  ro_brand: string;
  ro_model: string;
  installation_date: string;
  technician: string;
  notes: string;
}

/** Material used in a service record. */
export interface ServiceMaterialUsed {
  material_id: string;
  material_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/** Service as returned by the FastAPI backend. */
export interface Service {
  service_id: string;
  customer_id: string;
  service_date: string | null;
  service_type: string;
  technician: string;
  complaint: string;
  work_done: string;
  next_service_date: string | null;
  labour_charge: number;
  material_charge: number;
  total_amount: number;
  payment_status: string;
  notes: string;
  status: "UPCOMING" | "DUE_TODAY" | "OVERDUE" | null;
  completion_status: "PENDING" | "COMPLETED";
  materials?: ServiceMaterialUsed[];
}

/** Payload sent when completing a service. */
export interface ServiceCompletionData {
  work_done: string;
  next_service_date?: string | null;
  materials?: {
    material_id: string;
    quantity: number;
  }[];
  notes?: string;
}


/** Fields the user submits when creating or editing a service. */
export interface ServiceFormData {
  customer_id: string;
  service_date: string;
  service_type: string;
  technician: string;
  complaint: string;
  work_done: string;
  next_service_date: string;
  labour_charge: number | string;
  material_charge: number | string;
  payment_status: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Material & Inventory Types
// ---------------------------------------------------------------------------

/** Material as returned by the FastAPI backend. */
export interface Material {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  purchase_price: number;
  selling_price: number;
  supplier: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

/** Fields submitted when creating a new material. */
export interface MaterialFormData {
  material_name: string;
  category: string;
  unit: string;
  current_stock: number | string;
  minimum_stock: number | string;
  purchase_price: number | string;
  selling_price: number | string;
  supplier: string;
}

/** Fields submitted when updating an existing material (stock cannot be modified directly). */
export interface MaterialUpdateData {
  material_name: string;
  category: string;
  unit: string;
  minimum_stock: number | string;
  purchase_price: number | string;
  selling_price: number | string;
  supplier: string;
}

/** Stock transaction as returned by the FastAPI backend. */
export interface StockTransaction {
  transaction_id: string;
  material_id: string;
  transaction_type: string;
  quantity: number;
  date: string;
  reference_id: string;
  notes: string;
  current_stock?: number | null;
}

/** Fields submitted for a stock purchase. */
export interface PurchaseFormData {
  material_id: string;
  quantity: number | string;
  purchase_price?: number | string | null;
  date?: string | null;
  reference_id?: string;
  notes?: string;
}

/** Fields submitted for manual stock adjustment. */
export interface AdjustFormData {
  material_id: string;
  quantity: number | string;
  date?: string | null;
  reference_id?: string;
  notes?: string;
}

/** Reminder item as returned by the FastAPI backend. */
export type ReminderType = "SCHEDULED_SERVICE" | "NEXT_SERVICE_DUE";
export type ReminderStatus = "DUE_TODAY" | "TOMORROW" | "UPCOMING" | "OVERDUE";

export interface Reminder {
  reminder_id: string;
  reminder_type: ReminderType;
  status: ReminderStatus;
  date: string;
  days_diff: number;
  days_overdue?: number | null;
  service_id: string;
  customer_id: string;
  customer_name: string;
  mobile: string;
  address: string;
  area?: string;
  ro_brand?: string;
  ro_model?: string;
  service_type: string;
  technician?: string;
  complaint?: string;
  notes?: string;
}

export interface ReminderSummary {
  today_count: number;
  tomorrow_count: number;
  upcoming_count: number;
  overdue_count: number;
  total_active: number;
}

/** Report & Analytics interfaces */
export interface ReportPeriod {
  from_date: string;
  to_date: string;
}

export interface BusinessSummary {
  total_services: number;
  completed_services: number;
  pending_services: number;
  overdue_services: number;
  total_revenue: number;
  paid_amount: number;
  pending_payment_amount: number;
  partial_payment_amount: number;
  uncollected_amount: number;
  new_customers: number;
  customers_with_services: number;
  average_service_value: number;
  highest_service_value: number;
}

export interface PaymentStatusSummary {
  payment_status: string;
  count: number;
  total_amount: number;
}

export interface CustomerActivityReportItem {
  customer_id: string;
  customer_name: string;
  mobile: string;
  service_count: number;
  completed_count: number;
  total_value: number;
  last_service_date?: string | null;
}

export interface ServiceTypeReportItem {
  service_type: string;
  count: number;
  completed_count: number;
  total_value: number;
}

export interface TechnicianReportItem {
  technician: string;
  total_services: number;
  completed_services: number;
  pending_services: number;
  total_value: number;
}

export interface MaterialUsageReportItem {
  material_id: string;
  material_name: string;
  quantity_used: number;
  unit: string;
  estimated_cost: number;
}

export interface InventoryMovementReportItem {
  transaction_type: string;
  count: number;
  total_quantity: number;
}

export interface InventoryStatusSnapshot {
  total_materials: number;
  out_of_stock_count: number;
  low_stock_count: number;
  healthy_stock_count: number;
}

export interface DailyServiceReportItem {
  date: string;
  services_count: number;
  completed_count: number;
  revenue: number;
}

export interface ComprehensiveReport {
  period: ReportPeriod;
  summary: BusinessSummary;
  payments: PaymentStatusSummary[];
  service_types: ServiceTypeReportItem[];
  technicians: TechnicianReportItem[];
  customer_activity: CustomerActivityReportItem[];
  material_usage: MaterialUsageReportItem[];
  total_material_cost: number;
  inventory_movements: InventoryMovementReportItem[];
  inventory_snapshot: InventoryStatusSnapshot;
  daily_timeline: DailyServiceReportItem[];
}

