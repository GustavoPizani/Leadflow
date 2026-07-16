'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'leadflow_install_prompt_dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    if (isStandalone()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-3">
      <div className="glow-brand flex w-full max-w-sm items-center gap-3 rounded-xl border bg-popover p-3 text-sm text-popover-foreground">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          {showIosHint ? (
            <p>
              Instale o Leadflow: toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p>Instale o Leadflow no seu celular para acesso rápido e notificações.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!showIosHint && (
            <Button type="button" size="sm" onClick={install}>
              Instalar
            </Button>
          )}
          <Button type="button" size="icon-sm" variant="ghost" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
