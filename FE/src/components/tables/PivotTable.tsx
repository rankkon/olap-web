import type { PivotRow } from '../../types/olap'
import { formatNumber } from '../../utils/format'

interface PivotTableProps {
  rowHeader: string
  columnHeaders: string[]
  rows: PivotRow[]
}

export default function PivotTable({ rowHeader, columnHeaders, rows }: PivotTableProps) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{rowHeader}</th>
            {columnHeaders.map((header) => (
              <th className="align-right" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {row.values.map((value, index) => (
                <td className="align-right" key={`${row.label}-${index}`}>
                  {formatNumber(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
