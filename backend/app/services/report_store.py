import os
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional


class ReportStore:
    """
    SQLite-backed persistence for barrier reports and dynamic obstacles.
    Handles temporary vs persistent barrier lifecycle, auto-expiration,
    and querying for the live routing graph overlay.
    """

    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            env_db = os.getenv("DATABASE_PATH")
            if env_db:
                db_path = Path(env_db)
            else:
                db_path = Path(__file__).resolve().parent.parent / "data" / "reports.db"

        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes tables and indices."""
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS barrier_reports (
                    id TEXT PRIMARY KEY,
                    barrier_category TEXT NOT NULL,
                    segment_id TEXT NOT NULL,
                    segment_name TEXT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    image_filename TEXT,
                    image_url TEXT,
                    source TEXT NOT NULL,
                    verification_status TEXT NOT NULL,
                    barrier_type TEXT NOT NULL DEFAULT 'temporary',
                    duration_minutes INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    expires_at TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    notes TEXT,
                    prohibits_wheelchair INTEGER NOT NULL DEFAULT 0,
                    cost_multiplier REAL NOT NULL DEFAULT 1.0,
                    detection_id TEXT
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_active_segment ON barrier_reports (is_active, segment_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_expires_at ON barrier_reports (is_active, expires_at);"
            )
            conn.commit()

    def cleanup_expired(self) -> int:
        """
        Marks temporary barriers as inactive (is_active = 0) if their expiry timestamp has passed.
        Returns the count of newly expired barriers.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE barrier_reports
                SET is_active = 0, updated_at = ?
                WHERE barrier_type = 'temporary'
                  AND expires_at IS NOT NULL
                  AND expires_at <= ?
                  AND is_active = 1
                """,
                (now_iso, now_iso),
            )
            changed = cur.rowcount
            conn.commit()
            return changed

    def add_report(
        self,
        barrier_category: str,
        segment_id: str,
        latitude: float,
        longitude: float,
        segment_name: Optional[str] = None,
        image_filename: Optional[str] = None,
        image_url: Optional[str] = None,
        source: str = "user_report",
        verification_status: str = "human_verified",
        barrier_type: str = "temporary",
        duration_minutes: Optional[int] = 1440,
        notes: Optional[str] = None,
        prohibits_wheelchair: bool = True,
        cost_multiplier: float = 999.0,
        detection_id: Optional[str] = None,
        report_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates and stores a new barrier report."""
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        if report_id is None:
            report_id = f"rep_{uuid.uuid4().hex[:8]}"

        # Calculate expires_at
        expires_at_iso = None
        if barrier_type == "temporary":
            dur = duration_minutes if (duration_minutes and duration_minutes > 0) else 1440
            expires_at = now + timedelta(minutes=dur)
            expires_at_iso = expires_at.isoformat()

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO barrier_reports (
                    id, barrier_category, segment_id, segment_name, latitude, longitude,
                    image_filename, image_url, source, verification_status, barrier_type,
                    duration_minutes, created_at, updated_at, expires_at, is_active,
                    notes, prohibits_wheelchair, cost_multiplier, detection_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    barrier_category,
                    segment_id,
                    segment_name,
                    latitude,
                    longitude,
                    image_filename,
                    image_url,
                    source,
                    verification_status,
                    barrier_type,
                    duration_minutes,
                    now_iso,
                    now_iso,
                    expires_at_iso,
                    1,
                    notes,
                    1 if prohibits_wheelchair else 0,
                    float(cost_multiplier),
                    detection_id,
                ),
            )
            conn.commit()

        return self.get_report_by_id(report_id)

    def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single report by ID."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM barrier_reports WHERE id = ?", (report_id,)
            ).fetchone()
            if not row:
                return None
            return self._row_to_dict(row)

    def get_active_barriers(self) -> List[Dict[str, Any]]:
        """Returns all currently active barriers after running expiry cleanup."""
        self.cleanup_expired()
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM barrier_reports WHERE is_active = 1 ORDER BY created_at DESC"
            ).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_all_reports(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns all reports (active and inactive) sorted by newest first."""
        self.cleanup_expired()
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM barrier_reports ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def delete_report(self, report_id: str) -> bool:
        """Deletes a report by ID."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM barrier_reports WHERE id = ?", (report_id,))
            conn.commit()
            return cur.rowcount > 0

    def deactivate_report(self, report_id: str) -> bool:
        """Marks a report as inactive without deleting it."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE barrier_reports SET is_active = 0, updated_at = ? WHERE id = ?",
                (now_iso, report_id),
            )
            conn.commit()
            return cur.rowcount > 0

    def reset_all(self) -> None:
        """Deactivates all reports for a fresh baseline demo."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM barrier_reports;")
            conn.commit()

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["prohibits_wheelchair"] = bool(d["prohibits_wheelchair"])
        d["is_active"] = bool(d["is_active"])
        return d
