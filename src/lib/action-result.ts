export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function actionOk(message?: string): ActionResult {
  return { ok: true, message };
}

export function actionErr(error: string): ActionResult {
  return { ok: false, error };
}
