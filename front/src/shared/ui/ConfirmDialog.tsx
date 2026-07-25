import type { ReactNode } from 'react';
import Button from './Button';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // confirm 버튼을 파괴적(빨강)으로
  onConfirm: () => void;
  onCancel: () => void;
}

/** 확인 다이얼로그. scrim + 카드 + 돌아가기/확인 2버튼. 예매 취소 등 재확인용. Figma 02 dialog. */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = '확인',
  cancelLabel = '돌아가기',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog__scrim" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="dialog__title">{title}</h2>
          {body && <p className="dialog__body">{body}</p>}
        </div>
        <div className="dialog__footer">
          <Button variant="ghost" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="md" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
