import { useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

type ConfirmState = ConfirmOptions & { isOpen: boolean };

/** Diálogo de confirmación propio de la app (en lugar de window.confirm). */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const confirm = (options: ConfirmOptions) => setState({ ...options, isOpen: true });
  const dialogProps = {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    type: state.type,
    onConfirm: state.onConfirm,
    onCancel: () => {
      state.onCancel?.();
      setState((prev) => ({ ...prev, isOpen: false }));
    },
  };
  return { confirm, dialogProps };
}

export type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];
