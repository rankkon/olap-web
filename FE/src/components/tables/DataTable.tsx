import type { TableColumn, TableRow } from '../../types/report'

interface DataTableProps {
  columns: TableColumn[]
  rows: TableRow[]
}

export default function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`align-${column.align ?? 'left'}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${String(row[columns[0]?.key ?? ''])}`}>
              {columns.map((column) => (
                <td key={column.key} className={`align-${column.align ?? 'left'}`}>
                  {String(row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
