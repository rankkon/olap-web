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
            <th className="align-center">{rowHeader}</th>
            {columnHeaders.map((header, index) => (
              <th className="align-center" key={`${header}-${index}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.label}-${rowIndex}`}>
              <td className="align-center">{row.label}</td>
              {row.values.map((value, index) => (
                <td className="align-center" key={`${row.label}-${index}`}>
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
