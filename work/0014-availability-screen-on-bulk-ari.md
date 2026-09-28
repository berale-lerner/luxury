---
status: todo
opened: 2026-09-28
---

# The availability screen makes seven MiniHotel calls per week

## The problem

The admin availability screen (`apps/admin/server/src/availability/week.ts`)
asks MiniHotel's Immediate ARI once per night — seven calls for a week, each a
one-night stay. Immediate ARI answers for a whole stay, so a single call for
the week cannot say which night is taken.

It works, and today it costs little: the calls run in parallel, the whole load
took 50–150 ms on staging, and a 30-second cache stands in front. It becomes a
problem if the screen grows (a month is 30 calls) or is used constantly.

It also shows less than it could. Immediate ARI leaves out a room type that
cannot be booked for the stay asked for, so a dash on the screen means sold
out, closed, **or** a minimum stay — the screen cannot tell which.

## The fix

Move the screen to Bulk ARI: one call per week, per-night availability, plus
the minimum stay and closures as data. The client already has it
(`packages/minihotel`, `bulkAri`, tested against a recorded sandbox answer),
and the screen used it before 2026-09-28.

What blocks it: for our production user (`luxuryat`) Bulk ARI answers
`ERR 303: Incorrect room linkage setup` (MINIHOTEL.md). The room linkage is a
mapping MiniHotel sets up for a partner, so the first step is asking MiniHotel
support to set it up for `luxuryat`, for all room types.

Then:

1. Check from staging that Bulk ARI answers for `luxuryat` — the room-type
   codes may differ in case from Immediate's (`Twin` / `TWIN` in the sandbox)
2. Switch `fetchWeek` back to one `bulkAri` call, and show closures and the
   minimum stay instead of a bare dash
3. Keep Immediate ARI for the bot (work/0003): a guest asks about one stay,
   which is exactly what it answers

## Open

- Does the owner want to ask MiniHotel now, or only when the screen grows?
