import type { DashboardFailure } from './failures';

export function FailureNotice({
  failure,
  onRetry,
  busy,
}: {
  readonly failure: DashboardFailure;
  readonly onRetry: () => void;
  readonly busy: boolean;
}) {
  return (
    <div className="notice error" role="alert">
      <p>
        {failure.message}
        {failure.code && (
          <>
            {' '}
            קוד שגיאה: <span dir="ltr">{failure.code}</span>
          </>
        )}
      </p>
      <button type="button" onClick={onRetry} disabled={busy}>
        לנסות שוב
      </button>
    </div>
  );
}
