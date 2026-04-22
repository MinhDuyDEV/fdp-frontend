'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useBackendNotifications } from '@/hooks';
import type { Notification } from '@/types/api';

interface Props {
  userId: number;
  open: boolean;
  onClose: () => void;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return d.toLocaleDateString('vi-VN');
}

function NotificationItem({
  n,
  onMarkRead,
}: {
  n: Notification;
  onMarkRead: (id: number) => void;
}) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--aged)',
        fontSize: '0.75rem',
        background: n.isRead ? 'transparent' : 'var(--cream)',
      }}
    >
      <div style={{ color: 'var(--smoke)', lineHeight: 1.5 }}>{n.message}</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.62rem',
            color: 'var(--aged)',
          }}
        >
          {formatRelativeTime(n.createdAt)}
        </span>
        {!n.isRead && (
          <button
            onClick={() => onMarkRead(n.id)}
            style={{
              fontSize: '0.6rem',
              background: 'none',
              border: 'none',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              padding: 0,
            }}
            aria-label="Đánh dấu đã đọc"
          >
            Đọc
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPanel({ userId, open, onClose }: Props) {
  const { notifications, unreadCount, isLoading, error, fetchNotifications, markRead } =
    useBackendNotifications(userId);

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    if (open) {
      fetchNotifications(showUnreadOnly, 1, 20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterKey]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* Close on click outside */
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open, onClose]);

  const toggleUnreadFilter = useCallback(() => {
    setShowUnreadOnly((prev) => !prev);
    setFilterKey((k) => k + 1);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Thông báo"
      aria-live="polite"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        width: 340,
        maxHeight: 420,
        overflow: 'auto',
        background: 'var(--paper)',
        border: '2px solid var(--ink)',
        zIndex: 200,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid var(--aged)',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Thông báo {unreadCount > 0 ? `(${unreadCount} mới)` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleUnreadFilter}
            style={{
              fontSize: '0.6rem',
              background: 'none',
              border: '1px solid var(--aged)',
              cursor: 'pointer',
              padding: '2px 6px',
              color: showUnreadOnly ? 'var(--ink)' : 'var(--smoke)',
              fontWeight: showUnreadOnly ? 700 : 400,
            }}
          >
            {showUnreadOnly ? 'Tất cả' : 'Chưa đọc'}
          </button>
          <button
            onClick={onClose}
            aria-label="Đóng thông báo"
            style={{
              fontSize: '0.7rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--smoke)',
              fontWeight: 700,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {isLoading && (
        <div
          style={{
            padding: 14,
            fontSize: '0.7rem',
            color: 'var(--smoke)',
          }}
        >
          Đang tải…
        </div>
      )}
      {error && (
        <div style={{ padding: 14, fontSize: '0.7rem', color: 'var(--rust)' }}>{error}</div>
      )}
      {!isLoading && notifications.length === 0 && (
        <div
          style={{
            padding: 14,
            fontSize: '0.7rem',
            color: 'var(--smoke)',
          }}
        >
          Không có thông báo
        </div>
      )}
      {notifications.map((n) => (
        <NotificationItem key={n.id} n={n} onMarkRead={markRead} />
      ))}
    </div>
  );
}
