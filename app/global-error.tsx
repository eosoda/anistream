'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0B0B0F] text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-black text-white">Algo deu errado!</h2>
          <p className="text-xs text-gray-400">
            Ocorreu um erro inesperado na aplicação.
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs shadow-lg"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
