import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { formatDate } from '../lib/format';
import { usePageMeta } from '../lib/seo';

export function MessagesPage() {
  usePageMeta({
    title: 'Messages & Conversations — ZAIDAAT',
    description: 'Protected direct messaging with property owners, buyers, and verified professionals.',
    canonicalPath: '/messages',
  });
  const { user, loading: authLoading, refreshUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ threads: any[] }>('/api/messages/threads');
      setThreads(res.threads);
      const paramThread = searchParams.get('thread');
      if (paramThread) {
        const found = res.threads.find((t) => t.threadKey === paramThread);
        if (found) setActiveThread(found);
      } else if (res.threads[0] && !activeThread) {
        setActiveThread(res.threads[0]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to load conversations.');
    }
  }, [user, searchParams]);

  const loadThreadMessages = useCallback(async (threadKey: string) => {
    try {
      const res = await api.get<{ messages: any[] }>(`/api/messages/thread/${encodeURIComponent(threadKey)}`);
      setMessages(res.messages);
      refreshUser();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to load messages.');
    }
  }, [refreshUser]);

  useEffect(() => {
    if (!authLoading) loadThreads();
  }, [authLoading, loadThreads]);

  useEffect(() => {
    if (activeThread) {
      loadThreadMessages(activeThread.threadKey);
    }
  }, [activeThread, loadThreadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !body.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/api/messages', {
        recipientId: activeThread.peerId,
        contextType: activeThread.contextType || 'direct',
        contextId: activeThread.contextId || null,
        body: body.trim(),
      });
      setBody('');
      await loadThreadMessages(activeThread.threadKey);
      await loadThreads();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <MessageSquare className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Messages Inbox</h1>
          <Link to="/login" className="btn-primary mt-5">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Messages &amp; Conversations</h1>
      <p className="mt-1 text-sm text-slate-500">Protected direct chat with property owners, buyers, and hired professionals.</p>

      <div className="card mt-6 grid min-h-[520px] overflow-hidden md:grid-cols-12">
        <div className="border-b border-slate-200 md:col-span-4 md:border-b-0 md:border-r">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Conversations ({threads.length})
          </div>
          <div className="divide-y divide-slate-100">
            {threads.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.threadKey}
                  type="button"
                  onClick={() => {
                    setActiveThread(t);
                    setSearchParams({ thread: t.threadKey });
                  }}
                  className={`w-full px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                    activeThread?.threadKey === t.threadKey ? 'bg-brand-50/70' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{t.peerName}</span>
                    {t.unreadCount > 0 && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase text-brand-700">{t.contextType}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{t.lastMessage}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col md:col-span-8">
          {!activeThread ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-3.5">
                <p className="font-bold text-slate-900">{activeThread.peerName}</p>
                <p className="text-xs uppercase text-slate-400">{activeThread.contextType} conversation</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.map((m) => {
                  const mine = user && m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? 'ml-auto bg-navy-900 text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-slate-400' : 'text-slate-500'}`}>
                        {m.sender_name} • {formatDate(m.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-4">
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a reply..."
                  aria-label="Message reply"
                  className="input-field"
                />
                <button type="submit" disabled={sending || !body.trim()} className="btn-primary px-5 shrink-0">
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
