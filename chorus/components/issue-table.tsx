'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import {
  issueCategoryLabels,
  issueSeverityLabels,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  issueTypeLabels,
  issueTypeTone,
} from '@/types/labels';
import type { IssueCategory, IssueSeverity, IssueStatus, IssueType } from '@/types/enums';
import { timeAgo } from '@/utils/format';

export interface IssueRow {
  id: string;
  number: number;
  title: string;
  partName: string;
  projectName: string;
  provider: string | null;
  type: IssueType;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  updated_at: string;
}

const STATUS_TABS: { key: 'all' | IssueStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'dispositioned', label: 'Dispositioned' },
  { key: 'implemented', label: 'Implemented' },
  { key: 'validated', label: 'Validated' },
  { key: 'closed', label: 'Closed' },
];

export function IssueTable({ rows }: { rows: IssueRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updated_at', desc: true }]);
  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [query, setQuery] = useState('');

  const columns = useMemo<ColumnDef<IssueRow>[]>(
    () => [
      {
        accessorKey: 'number',
        header: '#',
        cell: ({ row }) => <span className="text-muted-foreground">#{row.original.number}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Issue',
        cell: ({ row }) => (
          <Link href={`/issues/${row.original.id}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'partName',
        header: 'Part',
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.partName}
            <div className="text-xs text-muted-foreground">{row.original.provider ?? 'Brand'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <StatusBadge label={issueTypeLabels[row.original.type]} tone={issueTypeTone[row.original.type]} />
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm">
            <ToneDot tone={issueSeverityTone[row.original.severity]} />
            {issueSeverityLabels[row.original.severity]}
          </span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{issueCategoryLabels[row.original.category]}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge label={issueStatusLabels[row.original.status]} tone={issueStatusTone[row.original.status]} />
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{timeAgo(row.original.updated_at)}</span>,
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (query && !`${r.number} ${r.title} ${r.partName}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [rows, statusFilter, query]);

  // TanStack Table returns non-memoizable functions; React Compiler skips it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 text-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={
                'rounded-full border px-3 py-1 ' +
                (statusFilter === tab.key
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted')
              }
            >
              {tab.label} {counts[tab.key] ? <span className="opacity-70">{counts[tab.key]}</span> : null}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search issues…"
          className="h-9 w-56 rounded-md border bg-transparent px-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                  No issues match.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} · derived state: Open → Dispositioned → Implemented → Validated → Closed
      </p>
    </div>
  );
}
