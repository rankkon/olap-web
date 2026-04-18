interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-card state-error">
      <h3>Có lỗi xảy ra</h3>
      <p>{message}</p>
      {onRetry ? (
        <button className="btn-secondary" type="button" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  )
}
