import * as SQLite from "expo-sqlite";

let db = null;

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("checkin.db");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_tickets (
        id INTEGER PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        qr_code TEXT NOT NULL UNIQUE,
        seat_label TEXT,
        section_name TEXT,
        is_used INTEGER NOT NULL DEFAULT 0,
        used_at TEXT,
        used_by_device TEXT,
        synced_at TEXT
      );
      CREATE TABLE IF NOT EXISTS local_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        scanned_at TEXT NOT NULL,
        device_id TEXT NOT NULL,
        result TEXT NOT NULL CHECK (result IN ('valid','already_used','invalid')),
        synced INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
}

export async function upsertTickets(eventId, tickets) {
  const database = await getDb();

  // Clear old tickets for this event before inserting fresh data
  await database.runAsync("DELETE FROM local_tickets WHERE event_id = ?", [eventId]);

  for (const t of tickets) {
    await database.runAsync(
      `INSERT OR REPLACE INTO local_tickets (ticket_id, event_id, qr_code, seat_label, section_name, is_used, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [t.id, eventId, t.qrCode, t.seatLabel ?? null, t.sectionName ?? null, t.isUsed ? 1 : 0]
    );
  }
}

export async function lookupTicketByQr(qrCode) {
  const database = await getDb();
  return database.getFirstAsync("SELECT * FROM local_tickets WHERE qr_code = ?", [qrCode]);
}

export async function markTicketUsed(ticketId, deviceId) {
  const database = await getDb();
  await database.runAsync(
    "UPDATE local_tickets SET is_used = 1, used_at = datetime('now'), used_by_device = ? WHERE ticket_id = ?",
    [deviceId, ticketId]
  );
}

export async function insertScan(scan) {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO local_scans (ticket_id, scanned_at, device_id, result, synced)
     VALUES (?, ?, ?, ?, 0)`,
    [scan.ticketId, scan.scannedAt, scan.deviceId, scan.result]
  );
}

export async function getPendingScans() {
  const database = await getDb();
  return database.getAllAsync("SELECT * FROM local_scans WHERE synced = 0 ORDER BY scanned_at ASC");
}

export async function markScansAsSynced(ids) {
  if (!ids.length) return;
  const database = await getDb();
  const placeholders = ids.map(() => "?").join(",");
  await database.runAsync(`UPDATE local_scans SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function getTicketCountForEvent(eventId) {
  const database = await getDb();
  const row = await database.getFirstAsync(
    "SELECT COUNT(*) as count FROM local_tickets WHERE event_id = ?",
    [eventId]
  );
  return row?.count ?? 0;
}

export async function getPendingScanCount() {
  const database = await getDb();
  const row = await database.getFirstAsync("SELECT COUNT(*) as count FROM local_scans WHERE synced = 0");
  return row?.count ?? 0;
}
