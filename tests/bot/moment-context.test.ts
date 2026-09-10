/**
 * What the model is told about this moment.
 *
 * The rule this file exists to hold: the code states facts and takes no view
 * on them. "The guest wrote 40 minutes ago" is a fact. "Apologise for the
 * delay" is how the business talks, and it lives in a prompt document the
 * owner can edit without a deploy.
 */
import { describe, expect, it } from 'vitest';
import { describeMoment } from '../../apps/bot/src/agent/index.js';

const NOW = new Date('2026-09-10T14:00:00Z');
const minutesBefore = (n: number) => new Date(NOW.getTime() - n * 60_000);

describe('the elapsed time', () => {
  it('is stated in the largest unit that is still honest', () => {
    const cases: Array<[number, string]> = [
      [0, 'just now'],
      [1, '1 minute ago'],
      [40, '40 minutes ago'],
      [59, '59 minutes ago'],
      [60, 'about 1 hour ago'],
      [187, 'about 3 hours ago'],
      [60 * 30, 'about 1 day ago'],
    ];

    for (const [minutes, expected] of cases) {
      // A model reasons about "about 3 hours" far more reliably than about
      // "187 minutes", and nobody would say the second out loud anyway.
      expect(describeMoment({ now: NOW, lastInboundAt: minutesBefore(minutes) })).toContain(
        expected,
      );
    }
  });

  it('is absent when the thread has no guest message', () => {
    const described = describeMoment({ now: NOW, lastInboundAt: null });
    expect(described).not.toContain('ago');
    expect(described).toContain('Current local time');
  });
});

describe('the local time', () => {
  it('belongs to the business, not to the server', () => {
    // 14:00 UTC is 17:00 in Jerusalem. A server in Amsterdam reasoning in
    // its own hours would tell a guest the wrong thing about "this evening".
    expect(describeMoment({ now: NOW, timeZone: 'Asia/Jerusalem' })).toContain('17:00');
    expect(describeMoment({ now: NOW, timeZone: 'UTC' })).toContain('14:00');
  });

  it('falls back rather than throwing on a zone the runtime does not know', () => {
    // A configuration mistake is not a reason to stop answering guests.
    const described = describeMoment({ now: NOW, timeZone: 'Mars/Olympus_Mons' });
    expect(described).toContain('2026-09-10 14:00 UTC');
  });
});

describe('what it says about itself', () => {
  it('tells the model this is context and not something anyone said', () => {
    // It arrives beside the conversation, so it has to be unmistakable: a
    // note the model answers, or quotes to the guest, is worse than no note.
    const described = describeMoment({ now: NOW, lastInboundAt: minutesBefore(30) });
    expect(described).toContain('written by the system, not by the guest');
    expect(described).toContain('never be quoted or answered');
  });

  it('says nothing about how to speak to the guest', () => {
    const described = describeMoment({ now: NOW, lastInboundAt: minutesBefore(90) }).toLowerCase();
    // The note does contain one instruction — that it is not to be quoted —
    // and that governs the note itself. What must never appear is guidance on
    // what to *say*: the moment "apologise for the delay" lives here, a piece
    // of how the business speaks has moved into the code, where the owner
    // cannot edit it without a developer (CLAUDE.md, "Editable content").
    for (const phrase of ['apolog', 'sorry', 'acknowledge', 'tell the guest', 'begin by']) {
      expect(described).not.toContain(phrase);
    }
  });
});
