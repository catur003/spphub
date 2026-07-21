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

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" onClick={onClose}>
        <div
          className="modal-dialog modal-dialog-centered"
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                {message}
              </p>
            </div>
            <div className="modal-footer">
              {!hideCancel && (
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  {cancelLabel}
                </button>
              )}
              <button type="button" className={`btn btn-${variant}`} onClick={onConfirm}>
                {confirmLabel || (hideCancel ? "OK" : "Ya, Lanjutkan")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
