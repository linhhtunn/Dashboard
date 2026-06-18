import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import execute_values

# Adjust python path to be able to import from backend/ai_agent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings

# Tables to migrate
TABLES = [
    "hosp_patients",
    "hosp_diagnoses_icd",
    "hosp_labevents",
    "hosp_omr",
    "hosp_d_icd_diagnoses",
    "hosp_d_labitems"
]

# Table DDL mapping for PostgreSQL
TABLE_DDLS = {
    "hosp_patients": """
        CREATE TABLE IF NOT EXISTS hosp_patients (
            subject_id TEXT PRIMARY KEY,
            gender TEXT,
            anchor_age TEXT,
            anchor_year TEXT,
            anchor_year_group TEXT,
            dod TEXT
        );
    """,
    "hosp_diagnoses_icd": """
        CREATE TABLE IF NOT EXISTS hosp_diagnoses_icd (
            subject_id TEXT,
            hadm_id TEXT,
            seq_num TEXT,
            icd_code TEXT,
            icd_version TEXT
        );
    """,
    "hosp_labevents": """
        CREATE TABLE IF NOT EXISTS hosp_labevents (
            labevent_id TEXT PRIMARY KEY,
            subject_id TEXT,
            hadm_id TEXT,
            specimen_id TEXT,
            itemid TEXT,
            order_provider_id TEXT,
            charttime TEXT,
            storetime TEXT,
            value TEXT,
            valuenum DOUBLE PRECISION,
            valueuom TEXT,
            ref_range_lower TEXT,
            ref_range_upper TEXT,
            flag TEXT,
            priority TEXT,
            comments TEXT
        );
    """,
    "hosp_omr": """
        CREATE TABLE IF NOT EXISTS hosp_omr (
            subject_id TEXT,
            chartdate TEXT,
            seq_num TEXT,
            result_name TEXT,
            result_value TEXT
        );
    """,
    "hosp_d_icd_diagnoses": """
        CREATE TABLE IF NOT EXISTS hosp_d_icd_diagnoses (
            icd_code TEXT,
            icd_version TEXT,
            long_title TEXT,
            PRIMARY KEY (icd_code, icd_version)
        );
    """,
    "hosp_d_labitems": """
        CREATE TABLE IF NOT EXISTS hosp_d_labitems (
            itemid TEXT PRIMARY KEY,
            label TEXT,
            fluid TEXT,
            category TEXT
        );
    """
}

def main():
    settings = get_settings()
    
    # 1. Resolve PostgreSQL connection string
    dsn = settings.resolved_memory_postgres_dsn
    if not dsn:
        print("Error: MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is not set in your .env file!")
        print("Please configure your Supabase connection string before running this script.")
        sys.exit(1)
        
    # 2. Resolve SQLite database path
    sqlite_db_path = settings.sqlite_db_path
    if not sqlite_db_path or not os.path.exists(sqlite_db_path):
        print(f"Error: SQLite database file not found at: {sqlite_db_path}")
        print("Please verify the SQLITE_DB_PATH in your .env file.")
        sys.exit(1)

    print(f"[*] Source Database (SQLite): {sqlite_db_path}")
    print("[*] Target Database (Supabase): Connected to cloud Postgres DSN")
    
    # 3. Establish connections
    try:
        sqlite_conn = sqlite3.connect(sqlite_db_path)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cur = sqlite_conn.cursor()
        
        pg_conn = psycopg2.connect(dsn)
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"Error establishing database connections: {e}")
        sys.exit(1)

    try:
        # 4. Migrate tables
        for table_name in TABLES:
            print("\n" + "="*50)
            print(f"[*] Migrating table: {table_name}")
            print("="*50)
            
            # Create table if not exists in Postgres
            ddl = TABLE_DDLS.get(table_name)
            if ddl:
                print(f"[+] Creating table {table_name} on Supabase if not exists...")
                pg_cur.execute(ddl)
                pg_conn.commit()
            
            # Truncate existing data to ensure a clean sync
            print(f"[+] Truncating old data in target table {table_name}...")
            pg_cur.execute(f"TRUNCATE TABLE {table_name} CASCADE;")
            pg_conn.commit()
            
            # Fetch SQLite columns
            sqlite_cur.execute(f"PRAGMA table_info({table_name})")
            columns = [row["name"] for row in sqlite_cur.fetchall()]
            col_str = ", ".join([f'"{col}"' for col in columns])
            
            # Query all rows from SQLite
            sqlite_cur.execute(f"SELECT * FROM {table_name}")
            
            # Batch insertion loop
            batch_size = 2000
            inserted_count = 0
            
            while True:
                rows = sqlite_cur.fetchmany(batch_size)
                if not rows:
                    break
                
                # Convert sqlite.Row to tuple and sanitize empty strings to None (NULL in Postgres)
                values = [tuple((None if x == "" else x) for x in row) for row in rows]
                
                # Dynamic bulk insert query
                placeholders = ", ".join(["%s"] * len(columns))
                insert_query = f"INSERT INTO {table_name} ({col_str}) VALUES %s"
                
                execute_values(pg_cur, insert_query, values)
                pg_conn.commit()
                
                inserted_count += len(rows)
                print(f"[+] Uploaded {inserted_count} rows...")
                
            print(f"[SUCCESS] Table '{table_name}' migrated successfully. Total: {inserted_count} rows.")

        print("\n" + "="*50)
        print("[FINISHED] All 6 clinical tables migrated to Supabase successfully!")
        print("="*50)

    except Exception as exc:
        print(f"\n[ERROR] Migration failed: {exc}")
        pg_conn.rollback()
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    main()
