'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { urlBase64ToUint8Array } from '@/lib/push-client-helpers';

type Status = 'checking' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export function PushSettings() {
  const [status, setStatus] = useState<Status>('checking');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const existing = await registration?.pushManager.getSubscription();
    setStatus(existing ? 'subscribed' : 'unsubscribed');
  }

  async function enable() {
    setPending(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Chave pública não configurada.');

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      setStatus('subscribed');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao ativar notificações.');
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setStatus('unsubscribed');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao desativar notificações.');
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao enviar teste.');
      setMessage('Notificação de teste enviada — confira seu dispositivo.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao enviar teste.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notificações push</CardTitle>
        <CardDescription>Receba um aviso no aparelho sempre que um lead chegar pra você.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status === 'unsupported' && (
          <p className="text-muted-foreground">Este navegador não suporta notificações push.</p>
        )}
        {status === 'denied' && (
          <p className="text-muted-foreground">
            Notificações bloqueadas para este site. Permita nas configurações do navegador para ativar.
          </p>
        )}
        {status === 'unsubscribed' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BellOff className="h-4 w-4" /> Desativadas
            </span>
            <Button type="button" size="sm" onClick={enable} disabled={pending}>
              Ativar
            </Button>
          </div>
        )}
        {status === 'subscribed' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-4 w-4 text-primary" /> Ativadas neste dispositivo
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={sendTest} disabled={pending}>
                Testar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={disable} disabled={pending}>
                Desativar
              </Button>
            </div>
          </div>
        )}
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
