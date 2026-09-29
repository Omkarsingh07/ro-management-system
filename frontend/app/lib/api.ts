/**
 * Thin API client for the FastAPI backend.
 *
 * All fetch calls are centralised here so the base URL is configured
 * in one place (NEXT_PUBLIC_API_URL in .env.local).
 */

import type {
  Customer,
  CustomerFormData,
  Service,
  ServiceFormData,
  ServiceCompletionData,
  Material,
  MaterialFormData,
  MaterialUpdateData,
  StockTransaction,
  PurchaseFormData,
  AdjustFormData,
  Reminder,
  ReminderSummary,
  ComprehensiveReport,
  AuthUser,
  LoginCredentials,
} from "./types";

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("ro_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    // If unauthorized, redirect to /login if running in browser and not on /login
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ro_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Try to extract a useful detail message from FastAPI error responses
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // ignore parse errors — use the status text
      message = `${res.status} ${res.statusText}`;
    }
    throw new Error(message);
  }

  // 204 No Content has no body
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Authentication API
// ---------------------------------------------------------------------------

export async function loginUser(credentials: LoginCredentials): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (user?.token && typeof window !== "undefined") {
    localStorage.setItem("ro_token", user.token);
  }
  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ro_token");
    }
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

// ---------------------------------------------------------------------------
// Customer API
// ---------------------------------------------------------------------------

export async function fetchCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>("/customers");
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = encodeURIComponent(query.trim());
  return apiFetch<Customer[]>(`/customers/search?q=${q}`);
}

export async function fetchCustomer(customerId: string): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${encodeURIComponent(customerId)}`);
}

export async function createCustomer(data: CustomerFormData): Promise<Customer> {
  return apiFetch<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(
  customerId: string,
  data: CustomerFormData
): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  return apiFetch<void>(`/customers/${encodeURIComponent(customerId)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Service API
// ---------------------------------------------------------------------------

export async function fetchServices(): Promise<Service[]> {
  return apiFetch<Service[]>("/services");
}

export async function fetchServicesToday(): Promise<Service[]> {
  return apiFetch<Service[]>("/services/today");
}

export async function fetchServicesUpcoming(days: number = 7): Promise<Service[]> {
  return apiFetch<Service[]>(`/services/upcoming?days=${days}`);
}

export async function fetchServicesOverdue(): Promise<Service[]> {
  return apiFetch<Service[]>("/services/overdue");
}

export async function fetchService(serviceId: string): Promise<Service> {
  return apiFetch<Service>(`/services/${encodeURIComponent(serviceId)}`);
}

export async function createService(data: ServiceFormData): Promise<Service> {
  return apiFetch<Service>("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateService(
  serviceId: string,
  data: Omit<ServiceFormData, "customer_id">
): Promise<Service> {
  return apiFetch<Service>(`/services/${encodeURIComponent(serviceId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteService(serviceId: string): Promise<void> {
  return apiFetch<void>(`/services/${encodeURIComponent(serviceId)}`, {
    method: "DELETE",
  });
}

export async function completeService(
  serviceId: string,
  data: ServiceCompletionData
): Promise<Service> {
  return apiFetch<Service>(`/services/${encodeURIComponent(serviceId)}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}


export async function fetchCustomerServices(customerId: string): Promise<Service[]> {
  return apiFetch<Service[]>(`/customers/${encodeURIComponent(customerId)}/services`);
}

// ---------------------------------------------------------------------------
// Inventory & Material API
// ---------------------------------------------------------------------------

export async function fetchMaterials(): Promise<Material[]> {
  return apiFetch<Material[]>("/materials");
}

export async function fetchMaterial(materialId: string): Promise<Material> {
  return apiFetch<Material>(`/materials/${encodeURIComponent(materialId)}`);
}

export async function searchMaterials(query: string): Promise<Material[]> {
  return apiFetch<Material[]>(`/materials/search?q=${encodeURIComponent(query)}`);
}

export async function createMaterial(data: MaterialFormData): Promise<Material> {
  return apiFetch<Material>("/materials", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMaterial(
  materialId: string,
  data: MaterialUpdateData
): Promise<Material> {
  return apiFetch<Material>(`/materials/${encodeURIComponent(materialId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function purchaseStock(data: PurchaseFormData): Promise<StockTransaction> {
  return apiFetch<StockTransaction>("/inventory/purchase", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adjustStock(data: AdjustFormData): Promise<StockTransaction> {
  return apiFetch<StockTransaction>("/inventory/adjust", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchLowStock(): Promise<Material[]> {
  return apiFetch<Material[]>("/inventory/low-stock");
}

export async function fetchStockTransactions(
  materialId?: string,
  transactionType?: string
): Promise<StockTransaction[]> {
  const params = new URLSearchParams();
  if (materialId) params.append("material_id", materialId);
  if (transactionType) params.append("transaction_type", transactionType);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<StockTransaction[]>(`/inventory/transactions${query}`);
}

// ---------------------------------------------------------------------------
// Reminders API
// ---------------------------------------------------------------------------

export async function fetchReminders(
  status?: string,
  reminderType?: string,
  days: number = 7
): Promise<Reminder[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (reminderType) params.append("reminder_type", reminderType);
  if (days) params.append("days", String(days));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Reminder[]>(`/reminders${query}`);
}

export async function fetchRemindersSummary(days: number = 7): Promise<ReminderSummary> {
  return apiFetch<ReminderSummary>(`/reminders/summary?days=${days}`);
}

export async function fetchRemindersToday(): Promise<Reminder[]> {
  return apiFetch<Reminder[]>("/reminders/today");
}

export async function fetchRemindersTomorrow(): Promise<Reminder[]> {
  return apiFetch<Reminder[]>("/reminders/tomorrow");
}

export async function fetchRemindersUpcoming(days: number = 7): Promise<Reminder[]> {
  return apiFetch<Reminder[]>(`/reminders/upcoming?days=${days}`);
}

export async function fetchRemindersOverdue(): Promise<Reminder[]> {
  return apiFetch<Reminder[]>("/reminders/overdue");
}

// ---------------------------------------------------------------------------
// Reports API
// ---------------------------------------------------------------------------

export async function fetchComprehensiveReport(
  fromDate?: string,
  toDate?: string
): Promise<ComprehensiveReport> {
  const params = new URLSearchParams();
  if (fromDate) params.append("from_date", fromDate);
  if (toDate) params.append("to_date", toDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ComprehensiveReport>(`/reports/summary${query}`);
}

export function getReportCsvExportUrl(
  fromDate?: string,
  toDate?: string,
  reportType: string = "daily"
): string {
  const params = new URLSearchParams();
  if (fromDate) params.append("from_date", fromDate);
  if (toDate) params.append("to_date", toDate);
  if (reportType) params.append("report_type", reportType);
  const query = params.toString() ? `?${params.toString()}` : "";
  const base = getBaseUrl();
  return `${base}/reports/export/csv${query}`;
}

