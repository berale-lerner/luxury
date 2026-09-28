import { ApiError } from '../../api';

/**
 * Why a dashboard could not load, in words the reader can act on — each
 * failure says who fixes it.
 */
const FAILURE: Record<string, string> = {
  not_configured: 'אין חיבור ל-MiniHotel בסביבה הזו: לא הוגדרו פרטי התחברות.',
  ip_not_authorized:
    'MiniHotel חוסם את כתובת ה-IP של השרת. צריך לבקש מהתמיכה שלהם להוסיף אותה ל-whitelist.',
  auth_failed: 'MiniHotel דחה את שם המשתמש, הסיסמה או קוד המלון.',
  vendor_error: 'MiniHotel החזיר שגיאה.',
  timeout: 'MiniHotel לא ענה בזמן.',
  unreachable: 'אין חיבור לשרת של MiniHotel.',
  bad_response: 'MiniHotel ענה בפורמט לא צפוי.',
  http_error: 'MiniHotel ענה בפורמט לא צפוי.',
};

export interface DashboardFailure {
  readonly message: string;
  /** The vendor's own code, for looking up in MINIHOTEL.md. */
  readonly code?: string;
}

export function explainFailure(cause: unknown): DashboardFailure {
  const message =
    cause instanceof ApiError && cause.code && FAILURE[cause.code]
      ? FAILURE[cause.code]!
      : 'טעינת הנתונים נכשלה.';
  const code = cause instanceof ApiError ? cause.vendorCode : undefined;
  return code ? { message, code } : { message };
}
