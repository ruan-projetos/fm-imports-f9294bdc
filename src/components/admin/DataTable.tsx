import { type ReactNode, useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortAccessor?: (row: T) => string | number | null | undefined;
};

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  searchable = true,
  searchPlaceholder = "Pesquisar…",
  searchAccessor,
  emptyState,
  onRowClick,
  pageSize = 20,
  toolbar,
  rowKey,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let arr = data ?? [];
    if (query && searchAccessor) {
      const q = query.toLowerCase();
      arr = arr.filter((r) => searchAccessor(r).toLowerCase().includes(q));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortAccessor) {
        arr = [...arr].sort((a, b) => {
          const av = col.sortAccessor!(a);
          const bv = col.sortAccessor!(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return arr;
  }, [data, query, searchAccessor, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    col.sortAccessor && "cursor-pointer select-none",
                    col.className,
                  )}
                  onClick={() => {
                    if (!col.sortAccessor) return;
                    if (sortKey === col.key) {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortKey(col.key);
                      setSortDir("asc");
                    }
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (
                      <span className="text-[10px] text-gold">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-border/40">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-5 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                      Nenhum registro encontrado.
                    </div>
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              pageData.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-t border-border/40 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/30",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 p-3 text-sm">
          <span className="text-xs text-muted-foreground">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"} · Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-border/60 p-1.5 text-muted-foreground disabled:opacity-40 hover:text-foreground"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-border/60 p-1.5 text-muted-foreground disabled:opacity-40 hover:text-foreground"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TableLoader() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
