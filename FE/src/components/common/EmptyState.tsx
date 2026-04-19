interface EmptyStateProps {
  title?: string
  note?: string
}

export default function EmptyState({
  title = 'Chưa có dữ liệu hiển thị',
  note = 'Vui lòng kiểm tra bộ lọc hoặc tải lại dữ liệu.',
}: EmptyStateProps) {
  return (
    <div className="state-card">
      <h3>{title}</h3>
      <p>{note}</p>
    </div>
  )
}
