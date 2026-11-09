-- Events calendar (2026-11-09): lets Admin switch a holiday off and run an event on weekends only.
-- Safe to run more than once. Until it runs, the game keeps working: holidays still start by themselves,
-- but Admin's "Automatic: on/off" switch and the "Weekends only" box report that this update is needed.

-- a holiday the admin switched off: it won't start by itself on its dates
alter table public.live_events add column if not exists holiday_off boolean not null default false;
-- runs only from Friday 18:00 to Monday 06:00 UTC, inside the event's start and end
alter table public.live_events add column if not exists weekends boolean not null default false;

-- ask the API to notice the new columns straight away
notify pgrst, 'reload schema';
