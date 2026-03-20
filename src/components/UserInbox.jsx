// src/components/UserInbox.jsx
// Real-time user inbox — notifications for vehicle verification, fleet requests, etc.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' },
  backBtn: {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
  },
  card: (unread) => ({
    background: unread ? 'var(--accent-glow)' : 'var(--bg-card)',
    border: `1px solid ${unread ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '12px', padding: '18px', marginBottom: '12px',
    transition: 'all 0.2s', cursor: unread ? 'pointer' : 'default',
  }),
  btn: (variant = 'primary', size = 'md') => ({
    padding: size === 'sm' ? '6px 14px' : '10px 20px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
    fontSize: size === 'sm' ? '12px' : '13px', transition: 'all 0.2s',
    background: variant === 'ghost' ? 'transparent' : 'var(--accent)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  liveChip: {
    fontSize: '11px', fontWeight: 700, padding: '2px 8px',
    borderRadius: '4px', background: 'var(--success)', color: '#fff',
    animation: 'blink 2s ease-in-out infinite',
  },
  emptyState: { textAlign: 'center', padding: '64px', color: 'var(--text-muted)' },
  emptyIcon: { fontSize: '32px', marginBottom: '12px' },
};

export default function UserInbox({ user, onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    loadNotifications();

    const ch = supabase.channel('user_inbox_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => setNotifications(prev => [payload.new, ...prev]))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n)))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  }

  async function markRead(notifId) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    if (!error) setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    if (!error) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div style={S.header}>
        <div style={S.title}>
          <span>📬</span> My Inbox
          {unreadCount > 0 && (
            <span style={{ fontSize: '13px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', background: 'var(--danger)', color: '#fff' }}>
              {unreadCount}
            </span>
          )}
          <span style={S.liveChip}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button style={S.btn('ghost', 'sm')} onClick={markAllRead}>Mark all read</button>
          )}
          {onBack && (
            <button style={S.backBtn} onClick={onBack}>← Back</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '48px' }}>
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div style={S.emptyState}>
          <div style={S.emptyIcon}>🔕</div>
          No notifications yet.
        </div>
      ) : (
        notifications.map(n => (
          <div
            key={n.id}
            style={S.card(!n.is_read)}
            onClick={() => !n.is_read && markRead(n.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: n.is_read ? 500 : 700, marginBottom: '4px' }}>
                {n.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{n.message}</div>
            {!n.is_read && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
                Click to mark as read
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
