-- Registrar dashboard schema. Safe to re-run: every statement is idempotent.

-- Students: ONLY the allow-listed columns from the workbook (see src/config/columns.ts).
-- Caste, religion, address, DOB, blood group and parents' names are never stored here.
CREATE TABLE IF NOT EXISTS students (
  uid            text PRIMARY KEY,
  name           text NOT NULL,
  program        text NOT NULL,
  short_program  text NOT NULL DEFAULT '',
  institute      text NOT NULL,
  cluster        text NOT NULL DEFAULT '',
  semester       text NOT NULL DEFAULT '',
  raw_status     text NOT NULL DEFAULT '',
  fee_status     text NOT NULL DEFAULT '',
  residence      text NOT NULL DEFAULT '',
  imported_at    timestamptz NOT NULL DEFAULT now()
);

-- One row describing the last import (counts shown in "Data notes").
CREATE TABLE IF NOT EXISTS import_meta (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  audit       jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Complaints and requests raised by students through the QR form.
CREATE TABLE IF NOT EXISTS requests (
  id            bigserial PRIMARY KEY,
  ref           text GENERATED ALWAYS AS ('REQ-' || lpad(id::text, 6, '0')) STORED UNIQUE,
  uid           text NOT NULL REFERENCES students(uid),
  category      text NOT NULL,
  subject       text NOT NULL,
  details       text NOT NULL,
  contact_phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'Open',
  staff_note    text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_uid_idx ON requests (uid, created_at DESC);

-- Every status change or note, with who made it.
CREATE TABLE IF NOT EXISTS request_events (
  id          bigserial PRIMARY KEY,
  request_id  bigint NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  at          timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,
  from_status text NOT NULL DEFAULT '',
  to_status   text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS request_events_request_idx ON request_events (request_id, at);

-- Added later: pending documents note and the two dates from the program tabs.
ALTER TABLE students ADD COLUMN IF NOT EXISTS pending_docs text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS verified_on  text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS pending_due  text NOT NULL DEFAULT '';
