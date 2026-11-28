// Every look the reels can use. A new day's look: add a file in ./catalog, import it here,
// and log it in reels/looks.json (see reels/PLAYBOOK.md, "The look of the day").
import {Look} from './types';
import {evidenceLocker} from './catalog/evidence-locker';
import {leonidaArcade} from './catalog/leonida-arcade';
import {leonidaHerald} from './catalog/leonida-herald';
import {leonidaSunset} from './catalog/leonida-sunset';
import {viceTape} from './catalog/vice-tape';

export const LOOKS: Record<string, Look> = Object.fromEntries(
  [viceTape, leonidaHerald, evidenceLocker, leonidaArcade, leonidaSunset].map((l) => [l.id, l]),
);
