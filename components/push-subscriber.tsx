'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { urlBase64ToUint8Array } from '@/lib/push-client-helpers';

/**
 * Inscreve o dispositivo para push automaticamente, sem depender de um botão manual — mirror do
 * components/push-subscriber.tsx do Real-Sales. Silencioso em qualquer falha (nunca bloqueia a
 * UI): sem suporte do navegador, permissão negada, ou usuário não autenticado, só desiste.
 */
export function PushSubscriber() {
  useEffect(() => {
    const timer = setTimeout(() => {
      trySubscribe().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

async function trySubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    await postSubscription(existing);
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  await postSubscription(subscription);
}

async function postSubscription(subscription: PushSubscription) {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  }).catch(() => null);
}
