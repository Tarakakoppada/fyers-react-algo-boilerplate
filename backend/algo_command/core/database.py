import sqlite3  
import json
import os
import threading

# --- REVERTED TO DESKTOP-SAFE ARCHITECTURE ---
USER_HOME = os.path.expanduser("~")
APP_DIR = os.path.join(USER_HOME, ".algo_command")

if not os.path.exists(APP_DIR):
    os.makedirs(APP_DIR)

DB_PATH = os.path.join(APP_DIR, "trading_vault.db")

# 🚨 INSTITUTIONAL FIX: Global Database Mutex Lock
db_lock = threading.Lock()

def get_connection():
    # timeout=10.0 forces SQLite to wait in queue instead of crashing
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    # WAL mode critical for concurrent Next.js reads and WebSocket writes
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS keys (broker TEXT PRIMARY KEY, client_id TEXT, access_token TEXT)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, data TEXT)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS engine_config (
                        id INTEGER PRIMARY KEY,
                        total_capital REAL,
                        max_risk_pct REAL,
                        asset_allocations TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
                        
        cursor.execute("SELECT COUNT(*) FROM engine_config")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO engine_config (id, total_capital, max_risk_pct, asset_allocations) VALUES (1, 0, 0.02, '{}')")
            
        conn.commit()
        conn.close()

def wal_checkpoint():
    with db_lock:
        try:
            conn = get_connection()
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            conn.close()
            print("🧹 [DATABASE] WAL Checkpoint truncated. Disk I/O optimized.")
        except Exception as e:
            print(f"⚠️ Failed WAL Checkpoint: {e}")

def update_state(key, data):
    with db_lock: 
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("REPLACE INTO state (key, data) VALUES (?, ?)", (key, json.dumps(data)))
        conn.commit()
        conn.close()

def get_state(key):
    with db_lock: 
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM state WHERE key = ?", (key,))
            row = cursor.fetchone()
            conn.close()
            if row: return json.loads(row[0])
        except:
            pass
        return {}

def save_keys(broker, client_id, access_token):
    with db_lock:
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("REPLACE INTO keys (broker, client_id, access_token) VALUES (?, ?, ?)", (broker.upper(), client_id, access_token))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"⚠️ DB Error (save_keys): {e}")

def get_keys(broker):
    with db_lock: 
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT client_id, access_token FROM keys WHERE broker = ?", (broker,))
            row = cursor.fetchone()
            conn.close()
            if row: return {"client_id": row[0], "access_token": row[1]}
        except:
            pass
        return None

def update_allocations(total_capital, max_risk_pct, allocations):
    with db_lock: 
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE engine_config SET total_capital = ?, max_risk_pct = ?, asset_allocations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                (total_capital, max_risk_pct, json.dumps(allocations))
            )
            conn.commit()
            conn.close()
        except Exception as e:
            pass

def get_allocations():
    with db_lock: 
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT total_capital, max_risk_pct, asset_allocations FROM engine_config WHERE id = 1")
            row = cursor.fetchone()
            conn.close()
            return {"total_capital": row[0], "max_risk_pct": row[1], "allocations": json.loads(row[2])} if row else None
        except Exception as e:
            return None

def update_single_trade(trade_id, trade_data):
    """
    🚨 PHASE 1 FIX: Atomic Read-Modify-Write.
    Prevents the Orchestrator from overwriting trades added by the UI milliseconds earlier.
    """
    with db_lock: 
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Read the absolute latest state
        cursor.execute("SELECT data FROM state WHERE key = 'active_trades'")
        row = cursor.fetchone()
        trades = json.loads(row[0]) if row else {}
        
        # 2. Modify only the specific trade (or delete if None)
        if trade_data is None:
            if trade_id in trades:
                del trades[trade_id]
        else:
            trades[trade_id] = trade_data
            
        # 3. Write back instantly
        cursor.execute("REPLACE INTO state (key, data) VALUES (?, ?)", ("active_trades", json.dumps(trades)))
        conn.commit()
        conn.close()

# Initialize the tables automatically upon import
init_db()