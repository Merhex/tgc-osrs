import { useEffect, useState } from 'react';
import { cardImageUrl } from '../render/imageStore';

export function useCardImage(cardId: string | 'back'): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    cardImageUrl(cardId)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [cardId]);
  return url;
}
