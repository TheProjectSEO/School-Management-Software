"use client"

import { useState, useMemo, ReactNode } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[]
  data: T[]
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  selectable?: boolean
  onSelectionChange?: (selected: T[]) => void
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: string
  rowKey?: keyof T
}

export default function DataTable<T extends object>({
  columns,
  data,
  pagination,
  onPageChange,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyMessage = "No data found",
  emptyIcon = "inbox",
  rowKey,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Add selection column if selectable
  const tableColumns = useMemo(() => {
    if (!selectable) return columns

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
    }

    return [selectionColumn, ...columns]
  }, [columns, selectable])

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
        typeof updater === "function" ? updater(rowSelection) : updater
      setRowSelection(newSelection)

      if (onSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)])
        onSelectionChange(selectedRows)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    manualPagination: !!pagination,
    pageCount: pagination?.totalPages,
    getRowId: rowKey ? (row) => String(row[rowKey]) : undefined,
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto -mx-px">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                      header.column.getCanSort() && "cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800"
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
                        <span className="material-symbols-outlined text-sm text-slate-400">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
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
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                      {emptyIcon}
                    </span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                    row.getIsSelected() && "bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
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
        <div className="px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:gap-0 items-start sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
                (_, i) => {
                  const pageNum =
                    Math.max(
                      1,
                      pagination.page - 2 + i - Math.max(0, pagination.page + 2 - pagination.totalPages)
                    );
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                        pageNum === pagination.page
                          ? "bg-primary text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}
            </div>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
