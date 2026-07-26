"use client";

import { useState } from "react";

type Variant = "danger" | "primary";

type ModalState = {
  show: boolean;
  title?: string;
  message: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  resolve?: (value: boolean) => void;
};

type ModalOptions = {
  title?: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
};

const STATE_KOSONG: ModalState = { show: false, message: "" };

/**
 * Pengganti confirm()/alert() bawaan browser.
 *
 * Pemakaian:
 *   const { confirm, alertMsg, modal } = useConfirmModal();
 *   if (!(await confirm("Hapus data ini?"))) return;
 *   ...
 *   await alertMsg("Gagal menghapus data.");
 *   ...
 *   return <div>{modal}...</div>;
 */
export function useConfirmModal() {
  const [state, setState] = useState<ModalState>(STATE_KOSONG);

  function confirm(message: string, opts: ModalOptions = {}) {
    return new Promise<boolean>((resolve) => {
      setState({
        show: true,
        message,
        variant: opts.variant || "danger",
        title: opts.title || "Konfirmasi",
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        resolve,
      });
    });
  }

  function alertMsg(message: string, opts: ModalOptions = {}) {
    return new Promise<boolean>((resolve) => {
      setState({
        show: true,
        message,
        variant: opts.variant || "primary",
        title: opts.title || "Pemberitahuan",
        hideCancel: true,
        resolve,
      });
    });
  }

  function close(result: boolean) {
    state.resolve?.(result);
    setState(STATE_KOSONG);
  }

  const modal = (
    <ConfirmModal
      show={state.show}
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      hideCancel={state.hideCancel}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  );

  return { confirm, alertMsg, modal };
}

type ConfirmModalProps = {
  show: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  hideCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  show,
  title = "Konfirmasi",
  message,
  confirmLabel,
  cancelLabel = "Batal",
  variant = "primary",
  hideCancel = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!show) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-accent hover:bg-accent-hover";

  return (
    <div
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-ink-900/50 p-4"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h5 className="text-base font-bold text-ink-900">{title}</h5>
          <button
            type="button"
            aria-label="Tutup"
            className="text-xl leading-none text-ink-500 hover:text-ink-900"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="whitespace-pre-line text-sm text-ink-700">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
          {!hideCancel && (
            <button
              type="button"
              className="rounded-control border border-border-soft px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface"
              onClick={onClose}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`rounded-control px-4 py-2 text-sm font-bold text-white transition ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel || (hideCancel ? "OK" : "Ya, Lanjutkan")}
          </button>
        </div>
      </div>
    </div>
  );
}
