import { toast } from "vue-sonner";
import { ApiError } from "../api";

function messageFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

export function useAppToast() {
  function toastError(message: string) {
    toast.error(message);
  }

  function toastSuccess(message: string) {
    toast.success(message);
  }

  function toastFromUnknown(err: unknown, fallback: string) {
    toast.error(messageFromUnknown(err, fallback));
  }

  return { toastError, toastSuccess, toastFromUnknown, toast };
}
