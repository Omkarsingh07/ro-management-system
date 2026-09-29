"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomer } from "@/app/lib/api";
import type { CustomerFormData } from "@/app/lib/types";
import CustomerForm from "@/app/customers/CustomerForm";

export default function NewCustomerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CustomerFormData) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createCustomer(data);
      // Navigate to the new customer's detail page on success
      router.push(`/customers/${created.customer_id}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* ── Breadcrumb & Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          <Link
            href="/customers"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Customers
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">New Customer</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">
          New Customer
        </h1>
      </div>

      <CustomerForm
        onSubmit={handleSubmit}
        submitLabel="Register Customer"
        submitting={submitting}
        error={error}
        onCancel={() => router.push("/customers")}
      />
    </div>
  );
}

