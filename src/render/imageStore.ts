import { getCard } from '../data/cards';
import { canvasFor } from './canvasCache';
import { renderCardBack, renderCardFace } from './cardFace';
import { renderPackFront } from './packArt';

const urlCache = new Map<string, Promise<string>>();

/** Small image URL for HTML views (collection log, summary, fallback). */
export function cardImageUrl(cardId: string | 'back'): Promise<string> {
  let p = urlCache.get(cardId);
  if (!p) {
    p = (async () => {
      const full = cardId === 'back' ? await renderCardBack(0.4) : await renderCardFace(getCard(cardId), { scale: 0.4 });
      const blob = await new Promise<Blob | null>((res) => full.toBlob(res, 'image/webp', 0.9));
      return blob ? URL.createObjectURL(blob) : full.toDataURL();
    })();
    p.catch(() => urlCache.delete(cardId));
    urlCache.set(cardId, p);
  }
  return p;
}

export function packFrontUrl(): Promise<string> {
  return canvasFor('pack:front', renderPackFront).then((c) => c.toDataURL('image/webp', 0.85));
}

