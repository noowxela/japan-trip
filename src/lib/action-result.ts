export type ActionErrorCode = "editor_required";

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string; code?: ActionErrorCode };

export function actionOk(message?: string, id?: string): ActionResult {
  if (id) return { ok: true, message, id };
  return { ok: true, message };
}

export function actionErr(
  error: string,
  code?: ActionErrorCode,
): ActionResult {
  return code ? { ok: false, error, code } : { ok: false, error };
}
