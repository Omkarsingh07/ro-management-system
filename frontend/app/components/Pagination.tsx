"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemName = "records",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="px-4 py-3 bg-gray-50/60 dark:bg-[#151518] border-t border-gray-200 dark:border-[#26262B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
      <div>
        Showing <span className="font-semibold text-gray-900 dark:text-white">{startIndex}</span>
        {" – "}
        <span className="font-semibold text-gray-900 dark:text-white">{endIndex}</span>
        {" of "}
        <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span>
        {" "}{itemName}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {/* Previous */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#202025] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            Previous
          </button>

          {/* Numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1.5 text-gray-400 dark:text-gray-500 font-medium">
                    …
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "border border-gray-200 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202025]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#202025] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
