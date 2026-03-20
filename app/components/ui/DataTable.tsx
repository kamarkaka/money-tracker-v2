import { cn } from "@/app/lib/utils";

interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedKeys?: Set<string>;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data found.",
  onRowClick,
  selectedKeys,
  sortKey,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              const canSort = col.sortable && onSort;
              return (
                <th
                  key={col.key}
                  onClick={canSort ? () => onSort(col.key) : undefined}
                  className={cn(
                    "px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400",
                    canSort && "cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-200",
                    col.className
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {canSort && (
                      <span className={cn("text-[10px]", isSorted ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-600")}>
                        {isSorted && sortOrder === "asc" ? "▲" : isSorted && sortOrder === "desc" ? "▼" : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const isSelected = selectedKeys?.has(keyExtractor(item));
            return (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "border-b border-zinc-100 hover:bg-blue-100 dark:border-zinc-800 dark:hover:bg-blue-900/40",
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/30"
                  : index % 2 === 1 && "bg-zinc-100 dark:bg-zinc-800/70",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-zinc-900 dark:text-zinc-100",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
