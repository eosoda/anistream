import React from 'react';
import { JikanCharacter } from '@/types/anime';
import { SafeImage } from '@/components/ui/SafeImage';
import { toPlainText } from '@/utils/formatters';

interface CharacterCardProps {
  item: JikanCharacter;
}

export function CharacterCard({ item }: CharacterCardProps) {
  const { character, role, voice_actors } = item;
  const imageUrl = character.images?.jpg?.image_url;
  const va = voice_actors?.find((v) => v.language === 'Japanese') || voice_actors?.[0];
  const characterName = toPlainText(character.name) || 'Personagem';
  const voiceActorName = toPlainText(va?.person.name);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl glass-panel glass-panel-hover border border-white/5">
      <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
        <SafeImage
          src={imageUrl}
          alt={characterName}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-grow">
        <h4 className="text-sm font-bold text-white truncate">{characterName}</h4>
        <span
          className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold mt-0.5 ${
            role === 'Main'
              ? 'bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30'
              : 'bg-white/10 text-gray-400'
          }`}
        >
          {role === 'Main' ? 'Principal' : 'Coadjuvante'}
        </span>

        {va && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">
            CV: <span className="text-gray-300">{voiceActorName || 'Não informado'}</span>
          </p>
        )}
      </div>
    </div>
  );
}
