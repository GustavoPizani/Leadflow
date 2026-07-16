'use client';

import { useEffect } from 'react';

export default function MetaOAuthPopupPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  useEffect(() => {
    const success = searchParams.status === 'success';
    window.opener?.postMessage({ type: 'meta_oauth_done', success }, window.location.origin);
    window.close();
  }, [searchParams.status]);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p>{searchParams.status === 'success' ? 'Conectado! Pode fechar esta janela.' : 'Falha ao conectar ao Meta.'}</p>
    </div>
  );
}
