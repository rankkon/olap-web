import PageHeader from '../components/common/PageHeader'
import DataTable from '../components/tables/DataTable'
import type { TableColumn, TableRow } from '../types/report'

const columns: TableColumn[] = [
  { key: 'metric', label: 'Metric' },
  { key: 'olap', label: 'OLAP', align: 'right' },
  { key: 'sql', label: 'SQL Check', align: 'right' },
  { key: 'diff', label: 'Sai lệch', align: 'right' },
  { key: 'status', label: 'Trạng thái' },
]

const rows: TableRow[] = [
  { metric: 'Revenue Q1', olap: 1260, sql: 1258, diff: 2, status: 'PASS' },
  { metric: 'Order Count Q1', olap: 4980, sql: 4980, diff: 0, status: 'PASS' },
  { metric: 'Inventory DN', olap: 2300, sql: 2296, diff: 4, status: 'CHECK' },
  { metric: 'Customer Active HCM', olap: 3200, sql: 3199, diff: 1, status: 'PASS' },
]

export default function DataValidationPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Data Validation"
        description="Đối chiếu kết quả OLAP với dữ liệu kiểm tra từ hệ quan hệ trước khi go-live."
      />

      <section className="content-card">
        <div className="card-header">
          <h3>Bảng đối chiếu OLAP vs SQL</h3>
          <button className="btn-secondary" type="button">
            Run Validation
          </button>
        </div>
        <DataTable columns={columns} rows={rows} />
      </section>

      <section className="validation-grid">
        <article className="content-card">
          <h3>Tổng hợp kết quả</h3>
          <ul className="plain-list">
            <li>PASS: 18 chỉ tiêu</li>
            <li>CHECK: 3 chỉ tiêu</li>
            <li>FAIL: 0 chỉ tiêu</li>
          </ul>
        </article>
        <article className="content-card">
          <h3>TODO bước tiếp theo</h3>
          <ul className="plain-list">
            <li>Kết nối endpoint `/compare` từ backend.</li>
            <li>Tự động highlight ngưỡng sai lệch vượt chuẩn.</li>
            <li>Lưu lịch sử chạy validation theo phiên bản cube.</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
