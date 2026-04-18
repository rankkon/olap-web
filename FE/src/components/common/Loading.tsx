interface LoadingProps {
  label?: string
}

export default function Loading({ label = 'Đang tải dữ liệu...' }: LoadingProps) {
  return (
    <div className="state-card" role="status">
      <span className="spinner" aria-hidden />
      <p>{label}</p>
    </div>
  )
}
