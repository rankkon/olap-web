import type { PivotRow } from '../../types/olap'
import { formatNumber } from '../../utils/format'

interface PivotTableProps {
  rowHeader: string
  secondaryRowHeader?: string | null
  columnHeaders: string[]
  rows: PivotRow[]
}

export default function PivotTable({ rowHeader, secondaryRowHeader, columnHeaders, rows }: PivotTableProps) {
  const showSecondary = Boolean(secondaryRowHeader)

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="align-center">{rowHeader}</th>
            {showSecondary ? <th className="align-center">{secondaryRowHeader}</th> : null}
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
              {showSecondary ? <td className="align-center">{row.secondaryLabel ?? '-'}</td> : null}
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
