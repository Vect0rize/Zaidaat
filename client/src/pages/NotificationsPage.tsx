import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { formatDate } from '../lib/format';

export function NotificationsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await api.get<{ notifications: any[] }>('/api/notifications');
    setNotifications(res.notifications);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <Bell className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Notifications</h1>
          <Link to="/login" className="btn-primary mt-5">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
        <button
          type="button"
          onClick={async () => {
            await api.post('/api/notifications/read-all');
            await refreshUser();
            load();
          }}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          <CheckCheck className="h-4 w-4" />
          Mark All Read
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">You are all caught up!</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={async () => {
                if (!n.is_read) {
                  await api.patch(`/api/notifications/${n.id}/read`);
                  await refreshUser();
                  load();
                }
              }}
              className={`card cursor-pointer p-4 transition ${
                n.is_read ? 'bg-white' : 'border-brand-300 bg-brand-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                </div>
                {n.link_url && (
                  <Link to={n.link_url} className="btn-secondary px-3 py-1.5 text-xs">
                    Open
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
