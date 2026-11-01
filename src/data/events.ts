/** A limited-time event. Admins turn one on or off from the Admin page; it is never saved on a character. */
export interface LiveEvent {
  id: string;
  name: string;
  blurb: string;
  /** multiplies all XP gained */
  xp: number;
  /** how many times each monster's drops are rolled */
  loot: number;
}

export const EVENTS: LiveEvent[] = [{ id: 'halloween', name: 'Halloween', blurb: 'Double XP and double loot drops', xp: 2, loot: 2 }];

export function eventDef(id: string | null | undefined): LiveEvent | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}
