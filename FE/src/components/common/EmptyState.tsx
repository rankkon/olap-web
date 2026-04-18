interface EmptyStateProps {
  title?: string
  note?: string
}

export default function EmptyState({
  title = 'Chưa có dữ liệu hiển thị',
  note = 'TODO: Nối dữ liệu từ backend sau khi hoàn tất cube.',
}: EmptyStateProps) {
  return (
    <div className="state-card">
      <h3>{title}</h3>
      <p>{note}</p>
    </div>
  )
}
