import type { ReactNode } from 'react'

export type AdminTableColumn<Row> = {
    key: string
    label: string
    render: (row: Row) => ReactNode
    align?: 'left' | 'right'
    className?: string
}

type AdminTableProps<Row> = {
    label: string
    columns: AdminTableColumn<Row>[]
    rows: Row[]
    rowKey: (row: Row) => string | number
    empty?: ReactNode
}

const AdminTable = <Row,>({
    label,
    columns,
    rows,
    rowKey,
    empty,
}: AdminTableProps<Row>) => (
    <div className="overflow-x-auto">
        <table aria-label={label} className="w-full border-collapse text-left text-sm">
            <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)] text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {columns.map((column) => (
                        <th
                            key={column.key}
                            scope="col"
                            className={`px-3 py-2 font-semibold first:pl-0 last:pr-0 ${
                                column.align === 'right' ? 'text-right' : ''
                            } ${column.className ?? ''}`}
                        >
                            {column.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
                {rows.length ? (
                    rows.map((row) => (
                        <tr
                            key={rowKey(row)}
                            className="group transition-colors hover:bg-slate-50"
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`px-3 py-2 align-middle first:pl-0 last:pr-0 ${
                                        column.align === 'right'
                                            ? 'text-right'
                                            : ''
                                    } ${column.className ?? ''}`}
                                >
                                    {column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length} className="py-2">
                            {empty}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
)

export default AdminTable
