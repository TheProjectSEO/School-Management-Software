"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import { clsx } from "clsx";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  selectedItems?: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  rowKey?: keyof T;
}

export default function DataTable<T extends object>({
  columns,
  data = [],
  pagination,
  onPageChange,
  selectable = false,
  onSelectionChange,
  selectedItems,
  loading = false,
  emptyMessage = "No data found",
  emptyIcon = "inbox",
  rowKey,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Sync internal checkbox state when parent clears the selection externally
  useEffect(() => {
    if (selectedItems?.length === 0) {
      setRowSelection({});
    }
  }, [selectedItems]);

  // Add selection column if selectable
  const tableColumns = useMemo(() => {
    if (!selectable) return columns;

    const selectionColumn: ColumnDef<T> = {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      ),
      size: 40,
    };

    return [selectionColumn, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);

      if (onSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => {
            // If rowKey is set, key is the rowKey value (e.g., student ID)
            // Otherwise, key is the numeric index
            if (rowKey) {
              return data.find((row) => String(row[rowKey]) === key);
            }
            return data[parseInt(key)];
          })
          .filter((row) => row !== undefined);
        onSelectionChange(selectedRows as T[]);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!pagination,
    pageCount: pagination?.totalPages,
    getRowId: rowKey ? (row) => String(row[rowKey]) : undefined,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto -mx-px">
        <table className="w-full min-w-[600px]">
          <thead className="bg-primary/5 border-b-2 border-primary/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={clsx(
                      "px-3 sm:px-4 py-3 text-left text-xs font-semibold text-primary/70 uppercase tracking-wider",
                      header.column.getCanSort() && "cursor-pointer select-none"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="material-symbols-outlined text-sm text-gray-400">
                          {header.column.getIsSorted() === "asc"
                            ? "arrow_upward"
                            : header.column.getIsSorted() === "desc"
                            ? "arrow_downward"
                            : "unfold_more"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
                      {emptyIcon}
                    </span>
                    <p className="text-sm text-gray-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    "hover:bg-gray-50 transition-colors",
                    row.getIsSelected() && "bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:gap-0 items-start sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            –{" "}
            <span className="font-medium">
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const totalButtons = Math.min(5, pagination.totalPages);
                let startPage = Math.max(1, pagination.page - Math.floor(totalButtons / 2));
                const endPage = Math.min(pagination.totalPages, startPage + totalButtons - 1);
                startPage = Math.max(1, endPage - totalButtons + 1);

                const pages: number[] = [];
                for (let p = startPage; p <= endPage; p++) {
                  pages.push(p);
                }

                return pages.map((pageNum) => (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => onPageChange?.(pageNum)}
                    className={clsx(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                      pageNum === pagination.page
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {pageNum}
                  </button>
                ));
              })()}
            </div>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
