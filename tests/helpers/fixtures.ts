/**
 * Seed data for the permission suite.
 *
 * Fixed identifiers and fixed dates: nothing here depends on the wall clock or
 * on the order tests run in. Seeded once, by the owner role, before any test
 * runs; tests that write do so inside a transaction that is rolled back.
 */
import type { Client } from 'pg';

export const ids = {
  guestA: '11111111-1111-4111-8111-111111111111',
  guestB: '22222222-2222-4222-8222-222222222222',
  publishedUnit: '33333333-3333-4333-8333-333333333333',
  unpublishedUnit: '44444444-4444-4444-8444-444444444444',
  bookingA: '55555555-5555-4555-8555-555555555555',
  bookingB: '66666666-6666-4666-8666-666666666666',
  conversationA: '77777777-7777-4777-8777-777777777777',
  conversationB: '88888888-8888-4888-8888-888888888888',
  messageA: '99999999-9999-4999-8999-999999999999',
  messageB: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  requestA: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  taskA: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;

export async function seed(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO public.guests (id, display_name, preferred_language, phone, email, internal_notes)
     VALUES ($1, 'Guest A', 'he', '+972500000001', 'a@example.com', 'pays late'),
            ($2, 'Guest B', 'en', '+972500000002', 'b@example.com', 'repeat guest')`,
    [ids.guestA, ids.guestB],
  );

  await client.query(
    `INSERT INTO public.units
       (id, name, description, capacity, bedrooms, amenities, is_published, minihotel_unit_code, internal_notes)
     VALUES ($1, 'Sea View Suite', 'Top floor, balcony', 4, 2, ARRAY['wifi','ac'], true,  'MH-001', 'lock code 4821'),
            ($2, 'Garden Studio',  'Ground floor',      2, 1, ARRAY['wifi'],      false, 'MH-002', 'renovation until spring')`,
    [ids.publishedUnit, ids.unpublishedUnit],
  );

  await client.query(
    `INSERT INTO public.unit_availability (unit_id, date, is_available, block_reason)
     VALUES ($1, DATE '2026-04-01', true,  NULL),
            ($1, DATE '2026-04-02', false, 'owner staying'),
            ($2, DATE '2026-04-01', false, 'renovation')`,
    [ids.publishedUnit, ids.unpublishedUnit],
  );

  await client.query(
    `INSERT INTO public.bookings (id, reference, guest_id, unit_id, check_in, check_out, status, internal_notes)
     VALUES ($1, 'BK-A-001', $3, $5, DATE '2026-04-10', DATE '2026-04-14', 'confirmed', 'early check-in agreed'),
            ($2, 'BK-B-001', $4, $5, DATE '2026-05-10', DATE '2026-05-12', 'confirmed', NULL)`,
    [ids.bookingA, ids.bookingB, ids.guestA, ids.guestB, ids.publishedUnit],
  );

  await client.query(
    `INSERT INTO public.conversations (id, guest_id, channel, channel_chat_id, agent_muted)
     VALUES ($1, $3, 'telegram', 'tg-chat-a', false),
            ($2, $4, 'telegram', 'tg-chat-b', false)`,
    [ids.conversationA, ids.conversationB, ids.guestA, ids.guestB],
  );

  await client.query(
    `INSERT INTO public.messages (id, conversation_id, direction, sender, body)
     VALUES ($1, $3, 'inbound', 'guest', 'Is the suite free in April?'),
            ($2, $4, 'inbound', 'guest', 'Can I get a late checkout?')`,
    [ids.messageA, ids.messageB, ids.conversationA, ids.conversationB],
  );

  await client.query(
    `INSERT INTO public.requests (id, conversation_id, guest_id, kind, details)
     VALUES ($1, $2, $3, 'booking_lead', '{"nights": 4}'::jsonb)`,
    [ids.requestA, ids.conversationA, ids.guestA],
  );

  await client.query(
    `INSERT INTO public.tasks (id, conversation_id, kind, payload)
     VALUES ($1, $2, 'handoff_to_human', '{}'::jsonb)`,
    [ids.taskA, ids.conversationA],
  );

  await client.query(
    `INSERT INTO public.admin_allowlist (email, added_by) VALUES ('owner@example.com', 'bootstrap')`,
  );

  await client.query(
    `INSERT INTO business.unit_pricing (unit_id, valid_from, valid_to, nightly_rate, cost_per_night)
     VALUES ($1, DATE '2026-01-01', NULL, 900.00, 310.00)`,
    [ids.publishedUnit],
  );

  await client.query(
    `INSERT INTO business.booking_charges (booking_id, amount) VALUES ($1, 3600.00)`,
    [ids.bookingA],
  );

  const supplier = await client.query<{ id: string }>(
    `INSERT INTO business.suppliers (name, contact) VALUES ('Clean Co', 'ops@clean.example') RETURNING id`,
  );

  await client.query(
    `INSERT INTO business.costs (unit_id, supplier_id, amount, incurred_on, category)
     VALUES ($1, $2, 250.00, DATE '2026-04-15', 'cleaning')`,
    [ids.publishedUnit, supplier.rows[0]!.id],
  );

  await client.query(
    `INSERT INTO business.payroll (person, amount, paid_on) VALUES ('Manager', 12000.00, DATE '2026-04-30')`,
  );
}
