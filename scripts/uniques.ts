/**
 * Unique items list.
 *   npm run uniques      rewrite docs/UNIQUES.md from the game data
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderUniqueList, UNIQUE_LIST_PATH } from '../src/data/uniqueList';

writeFileSync(join(__dirname, '..', UNIQUE_LIST_PATH), renderUniqueList());
console.log(`Wrote ${UNIQUE_LIST_PATH}`);
