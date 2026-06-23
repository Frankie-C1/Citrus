import type { Toast as ToastType } from "../types";

export function Toast({ toast }: { toast?: ToastType }) {
  return toast ? <div className="toast">{toast.message}</div> : null;
}
