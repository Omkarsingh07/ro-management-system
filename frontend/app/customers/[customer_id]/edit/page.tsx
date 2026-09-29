"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCustomer, updateCustomer } from "@/app/lib/api";
import type { Customer, CustomerFormData } from "@/app/lib/types";
import CustomerForm from "@/app/customers/CustomerForm";

export default function EditCustomerPage() {
  const { customer_id } = useParams<{ customer_id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchCustomer(customer_id);
        setCustomer(data);
      } catch (e: unknown) {
        setLoadError(
          e instanceof Error ? e.message : "Failed to load customer."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer_id]);

  async function handleSubmit(data: CustomerFormData) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateCustomer(customer_id, data);
      router.push(`/customers/${customer_id}`);
      router.refresh();
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to update customer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading customer…</p>;
  }

  if (loadError || !customer) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-sm text-red-700 dark:text-rose-400 max-w-lg">
        {loadError ?? "Customer not found."}
        <div className="mt-3">
          <Link
            href="/customers"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  // Build form defaults from the loaded customer
  const initial: CustomerFormData = {
    name: customer.name,
    mobile: customer.mobile,
    alternate_mobile: customer.alternate_mobile ?? "",
    address: customer.address ?? "",
    area: customer.area ?? "",
    ro_brand: customer.ro_brand ?? "",
    ro_model: customer.ro_model ?? "",
    installation_date: customer.installation_date ?? "",
    technician: customer.technician ?? "",
    notes: customer.notes ?? "",
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          <Link
            href={`/customers/${customer_id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {customer.name}
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">Edit</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">
          Edit Customer
        </h1>
      </div>

      <CustomerForm
        initial={initial}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        submitting={submitting}
        error={submitError}
        onCancel={() => router.push(`/customers/${customer_id}`)}
      />
    </div>
  );
}
