# RemitWise Operations Guide

This document covers operational procedures for RemitWise, including database backup, restore, and production deployment considerations.

---

## Database

### Current Setup

RemitWise uses **SQLite** (via Prisma) as its database. The database file is a single portable file on disk:

| Environment | Default path           | Configured via     |
|-------------|------------------------|--------------------|
| Development | `./prisma/dev.db`      | `DATABASE_URL` env |
| Test        | In-memory / temp file  | `TEST_DATABASE_URL` |
| Production  | Path you set           | `DATABASE_URL` env |

The schema lives in [prisma/schema.prisma](prisma/schema.prisma). It currently stores:

- **User** — Stellar wallet address + timestamps
- **UserPreference** — currency, language, notification settings (1-to-1 with User)

> **Production recommendation:** For hosted deployments, migrate to a managed PostgreSQL service (Supabase, Neon, PlanetScale, Vercel Postgres, Railway, etc.) to get point-in-time recovery, managed backups, and connection pooling. See [Migrating to PostgreSQL](#migrating-to-postgresql) below.

---

## Backup Strategy

### SQLite (Development / Self-hosted)

SQLite databases are a single file. The safest way to back them up without corruption is to use SQLite's built-in `.backup` command or simply copy the file while no writes are in flight.

**Retention policy:** Keep at least **7 daily backups** before rotating. For production data, extend to 30 days.

#### Manual backup

```bash
# Using SQLite's online backup (safe while DB is live)
sqlite3 /path/to/dev.db ".backup '/path/to/backups/dev.db.$(date +%Y%m%d_%H%M%S)'"

# Or a simple file copy (safe when app is stopped, or with WAL mode enabled)
cp /path/to/dev.db /path/to/backups/dev.db.$(date +%Y%m%d_%H%M%S)
```

#### Automated backup script

The repository ships a backup script at [scripts/backup-db.sh](scripts/backup-db.sh).

```bash
# Run once manually
bash scripts/backup-db.sh

# Schedule daily at 02:00 via cron (edit with `crontab -e`)
0 2 * * * /bin/bash /absolute/path/to/remitwise/scripts/backup-db.sh >> /var/log/remitwise-backup.log 2>&1
```

The script:
1. Creates a timestamped `.db` copy in `./backups/`
2. Optionally uploads to S3 if `BACKUP_S3_BUCKET` is set
3. Deletes local copies older than `BACKUP_RETENTION_DAYS` (default: 7)

#### Uploading to S3 (optional)

Set these environment variables (`.env.local` or your deployment secrets):

```bash
BACKUP_S3_BUCKET=your-bucket-name          # Required to enable S3 upload
BACKUP_S3_PREFIX=remitwise/db              # Optional prefix, default: remitwise/db
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

Requires the [AWS CLI](https://aws.amazon.com/cli/) to be installed on the host.

---

### Managed PostgreSQL (Production)

If you switch to a managed PostgreSQL provider, built-in automated backups handle most of this for you:

| Provider         | Automatic backups | Retention   | Point-in-time recovery | Notes                                      |
|------------------|-------------------|-------------|------------------------|--------------------------------------------|
| Supabase         | Yes (daily)       | 7 days (free), 30 days (Pro) | Pro plan | Enable in Project Settings → Database     |
| Neon             | Yes (continuous)  | 7 days      | Yes (all plans)        | Branching also acts as a snapshot          |
| Vercel Postgres  | Yes (daily)       | 7 days      | Paid plans             | Managed via Vercel dashboard               |
| Railway          | Yes (daily)       | 7 days      | Paid plans             | Configure in service settings              |
| AWS RDS          | Yes (automated)   | 1–35 days   | Yes                    | Set `BackupRetentionPeriod` in console     |

For these providers, **no additional scripting is needed** — verify that automated backups are enabled in the provider dashboard and set a retention period of at least 7 days.

#### Manual `pg_dump` snapshot (any PostgreSQL)

Even with managed backups, taking a manual snapshot before schema migrations is good practice:

```bash
# Full dump (custom format — compressed, supports selective restore)
pg_dump --format=custom \
  --no-acl --no-owner \
  --dbname="$DATABASE_URL" \
  --file="remitwise_$(date +%Y%m%d_%H%M%S).pgdump"

# Restore a specific dump
pg_restore --clean --no-acl --no-owner \
  --dbname="$DATABASE_URL" \
  remitwise_20260101_020000.pgdump
```

---

## Restore Steps

### Restoring a SQLite backup

1. **Stop the application** (or ensure no active write connections).

2. **Replace the database file:**
   ```bash
   # Back up the current (possibly corrupted) file first
   cp prisma/dev.db prisma/dev.db.broken

   # Restore from a known-good backup
   cp backups/dev.db.20260101_020000 prisma/dev.db
   ```

3. **Verify the restored database:**
   ```bash
   sqlite3 prisma/dev.db "SELECT count(*) FROM User;"
   ```

4. **Run any pending Prisma migrations** to ensure schema is current:
   ```bash
   npx prisma migrate deploy
   ```

5. **Restart the application.**

### Restoring from a managed PostgreSQL backup

Follow your provider's restore flow:

- **Supabase:** Dashboard → Database → Backups → Restore
- **Neon:** Dashboard → Branches → Create branch from point-in-time
- **Vercel Postgres:** Dashboard → Storage → your DB → Backups tab
- **Railway:** Dashboard → your database service → Backups

After restoring at the provider level:

```bash
# Apply any migrations that were added after the backup point
npx prisma migrate deploy
```

### Restoring a `pg_dump` file

```bash
# 1. Create a clean target database (optional — pg_restore --clean handles this)
createdb remitwise_restored

# 2. Restore
pg_restore --clean --no-acl --no-owner \
  --dbname="postgresql://user:pass@host/remitwise_restored" \
  remitwise_20260101_020000.pgdump

# 3. Run pending migrations
DATABASE_URL="postgresql://user:pass@host/remitwise_restored" \
  npx prisma migrate deploy
```

---

## Migrating to PostgreSQL

To switch from SQLite to PostgreSQL:

1. **Update `prisma/schema.prisma`:**
   ```diff
   datasource db {
   -  provider = "sqlite"
   +  provider = "postgresql"
      url      = env("DATABASE_URL")
   }
   ```

2. **Set `DATABASE_URL`** to your PostgreSQL connection string:
   ```bash
   DATABASE_URL="postgresql://user:password@host:5432/remitwise?schema=public"
   ```

3. **Create a new migration** (or reset for a fresh database):
   ```bash
   # For a fresh database
   npx prisma migrate dev --name init

   # For an existing database with no prior Prisma migrations
   npx prisma migrate deploy
   ```

4. **Migrate existing data** from SQLite (if needed):
   ```bash
   # Export SQLite data as SQL
   sqlite3 prisma/dev.db .dump > sqlite_export.sql

   # Data will need manual adjustment for PostgreSQL syntax differences
   # (boolean literals, AUTOINCREMENT → SERIAL, etc.)
   ```

   For a smoother migration, use a tool like [pgloader](https://pgloader.io/):
   ```bash
   pgloader sqlite:///absolute/path/prisma/dev.db \
     postgresql://user:password@host/remitwise
   ```

---

## Checklist — Before a Production Release

- [ ] Confirm automated backups are enabled in the database provider dashboard
- [ ] Verify backup retention is set to at least 7 days
- [ ] Take a manual snapshot / `pg_dump` before running schema migrations
- [ ] Test restore procedure on a staging environment at least once
- [ ] Confirm `DATABASE_URL` points to the correct production database
- [ ] Run `npx prisma migrate deploy` (not `migrate dev`) in production
