import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNIQUES } from '../src/data/bases';
import { renderUniqueList, UNIQUE_LIST_PATH } from '../src/data/uniqueList';

describe('the unique items list', () => {
  it('names every unique once', () => {
    const list = renderUniqueList();
    for (const u of UNIQUES) expect(list.split(`**${u.name}**`).length - 1, u.name).toBe(1);
  });

  it('is up to date (run `npm run uniques` if not)', () => {
    const onDisk = readFileSync(UNIQUE_LIST_PATH, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(renderUniqueList());
  });
});
