'use client';

import React, { useState } from 'react';
import { MessageSquare, Heart, EyeOff, Send, User } from 'lucide-react';

export interface CommentItem {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  isSpoiler: boolean;
  likes: number;
  createdAt: string;
}

export function EpisodeComments({ episodeId }: { episodeId: string }) {
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 'c1',
      author: 'OtakuMaster',
      content: 'Que cena épica no final desse episódio! A animação estava perfeita!',
      isSpoiler: false,
      likes: 14,
      createdAt: 'Há 2 horas',
    },
    {
      id: 'c2',
      author: 'AnimeFan99',
      content: 'CUIDADO: No minuto 14:20 ocorre a revelação do verdadeiro vilão da temporada!',
      isSpoiler: true,
      likes: 8,
      createdAt: 'Há 5 horas',
    },
  ]);

  const [newComment, setNewComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const item: CommentItem = {
      id: Date.now().toString(),
      author: 'Você',
      content: newComment.trim(),
      isSpoiler,
      likes: 0,
      createdAt: 'Agora mesmo',
    };

    setComments([item, ...comments]);
    setNewComment('');
    setIsSpoiler(false);
  };

  const toggleLike = (id: string) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  const toggleSpoilerReveal = (id: string) => {
    setRevealedSpoilers({ ...revealedSpoilers, [id]: !revealedSpoilers[id] });
  };

  return (
    <div className="space-y-6 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <MessageSquare size={20} className="text-[#FF6B00]" />
        <h3 className="text-base font-bold text-white">Comentários da Comunidade ({comments.length})</h3>
      </div>

      {/* Formulário Novo Comentário */}
      <form onSubmit={handleAddComment} className="space-y-3">
        <textarea
          rows={3}
          placeholder="Escreva seu comentário sobre este episódio..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full p-4 rounded-2xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="accent-[#FF6B00] rounded"
            />
            <span className="flex items-center gap-1 font-bold">
              <EyeOff size={14} className="text-amber-400" />
              Marcar como Spoiler
            </span>
          </label>

          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Send size={14} />
            <span>Comentar</span>
          </button>
        </div>
      </form>

      {/* Lista de Comentários */}
      <div className="space-y-4 pt-2">
        {comments.map((comment) => {
          const isRevealed = revealedSpoilers[comment.id];
          return (
            <div
              key={comment.id}
              className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center font-bold text-xs">
                    <User size={14} />
                  </div>
                  <span className="text-xs font-bold text-white">{comment.author}</span>
                  <span className="text-[10px] text-gray-500">{comment.createdAt}</span>
                </div>

                <button
                  onClick={() => toggleLike(comment.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Heart size={14} className={comment.likes > 0 ? 'fill-red-400 text-red-400' : ''} />
                  <span>{comment.likes}</span>
                </button>
              </div>

              {comment.isSpoiler && !isRevealed ? (
                <div
                  onClick={() => toggleSpoilerReveal(comment.id)}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <EyeOff size={16} />
                    Contém Spoiler! Clique para revelar o conteúdo.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-300 leading-relaxed">{comment.content}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
