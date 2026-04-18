# core/radar_scanner.py
import time
from core import database
from data_feeds import indian_feed
from strategies import strat_01_frvp
import requests
from email.utils import parsedate_to_datetime
from datetime import datetime

TIME_OFFSET = 0.0

def sync_exchange_clock():
    global TIME_OFFSET
    try:
        res = requests.get("https://api-t1.fyers.in/api/v3", timeout=3)
        server_time = parsedate_to_datetime(res.headers['Date']).timestamp()
        TIME_OFFSET = server_time - time.time()
    except Exception:
        pass

def get_real_now():
    return datetime.fromtimestamp(time.time() + TIME_OFFSET)

def push_telegram_alert(message):
    try:
        from core import alerts
        if alerts: alerts.broadcast_setup("FRACTAL SNIPER", message)
    except Exception:
        print(f"📲 [TELEGRAM] {message}")

def run_live_scanner():
    print("📡 [RADAR] Independent Multi-Asset Intelligence Daemon Booted.")
    sync_exchange_clock()
    
    while True:
        try:
            now = get_real_now()
            
            # 🚨 Changed to 15:20 to allow per-asset profiles to manage themselves
            if now.hour == 15 and now.minute >= 20:
                time.sleep(60)
                continue
            
            if now.minute % 5 == 0 and now.second < 10:
                radar_state = database.get_state("radar")
                
                if radar_state and radar_state.get("status") == "ACTIVE":
                    watchlist = radar_state.get("watchlist", [])
                    data_broker = radar_state.get("data_broker", "FYERS")
                    
                    radar_state["scan_status"] = f"Crunching math for {len(watchlist)} assets..."
                    database.update_state("radar", radar_state)

                    for symbol in watchlist:
                        try:
                            start_epoch = int(time.time() - (5 * 86400))
                            end_epoch = int(time.time())
                            
                            df = indian_feed.get_candles(symbol, "5", start_epoch, end_epoch, data_broker)
                            
                            if df is not None and not df.empty:
                                alert_fired, msg, setup, setup_timestamp = strat_01_frvp.analyze(df, symbol)
                                
                                if alert_fired:
                                    last_alert_key = f"last_alert_{symbol}"
                                    if radar_state.get(last_alert_key) != str(setup_timestamp):
                                        print(f"🚨 [RADAR HIT] Kinetic Setup found on {symbol}!")
                                        push_telegram_alert(msg)
                                        
                                        radar_state = database.get_state("radar")
                                        radar_state[last_alert_key] = str(setup_timestamp)
                                        
                                        if "signals" not in radar_state:
                                            radar_state["signals"] = []
                                            
                                        new_signal = {
                                            "id": setup.get("id"),
                                            "symbol": symbol,
                                            "type": setup.get("type"),
                                            "score": setup.get("score"),
                                            "instrument": setup.get("instrument"),
                                            "entry": setup.get("entry"),
                                            "sl": setup.get("sl"),
                                            "target": setup.get("target"),
                                            "timestamp": str(setup_timestamp)
                                        }
                                        
                                        filtered_signals = [s for s in radar_state["signals"] if s.get("symbol") != symbol]
                                        radar_state["signals"] = [new_signal] + filtered_signals
                                        radar_state["signals"] = radar_state["signals"][:10]
                                        
                                        database.update_state("radar", radar_state)
                        except Exception as e:
                            print(f"⚠️ [RADAR ERROR] Failed to scan {symbol}: {e}")
                    
                    radar_state = database.get_state("radar")
                    radar_state["scan_status"] = "Awaiting next 5-minute candle close..."
                    database.update_state("radar", radar_state)

                time.sleep(50) 
                
        except Exception as e:
            print(f"⚠️ [RADAR DAEMON ERROR]: {e}")
            
        time.sleep(1)