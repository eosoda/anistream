'use client';

import React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-xl font-black text-white">Ops, ocorreu um erro ao carregar este conteúdo.</h2>
      <p className="text-xs text-gray-400 max-w-md">
        {error?.message || 'Tente recarregar a página ou voltar para o início.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs shadow-lg shadow-[#FF6B00]/30 transition-all"
      >
        Tentar novamente
      </button>
    </div>
  );
}
