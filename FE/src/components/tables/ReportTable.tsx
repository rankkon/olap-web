import type { TableColumn, TableRow } from '../../types/report'
import DataTable from './DataTable'

interface ReportTableProps {
  title: string
  columns: TableColumn[]
  rows: TableRow[]
}

export default function ReportTable({ title, columns, rows }: ReportTableProps) {
  return (
    <section className="content-card">
      <div className="card-header">
        <h3>{title}</h3>
        <button className="btn-secondary" type="button">
          Export CSV
        </button>
      </div>
      <DataTable columns={columns} rows={rows} />
      <p className="card-note">TODO: Nối export thật khi backend hoàn thiện.</p>
    </section>
  )
}
