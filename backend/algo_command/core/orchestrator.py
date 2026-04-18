import time
import threading
import os
import sys
import requests
from email.utils import parsedate_to_datetime
from datetime import datetime, time as datetime_time
from dotenv import load_dotenv
import json
import importlib

def get_asset_end_time(symbol):
    try:
        profile_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "asset_profiles.json")
        if getattr(sys, 'frozen', False): 
            profile_path = os.path.join(os.path.dirname(sys.executable), "data", "asset_profiles.json")
        with open(profile_path, "r") as f:
            profiles = json.load(f)
            if symbol in profiles:
                et = profiles[symbol].get("end_time", "15:00")
                return datetime_time(int(et.split(":")[0]), int(et.split(":")[1]))
    except Exception: pass
    return datetime_time(15, 0)

load_dotenv()

from core import database, symbol_master
from execution.order_router import broadcast_order, close_live_position

try:
    from core import alerts
except ImportError:
    alerts = None

print("🚨 BOOTING THE MULTI-TURRET ORCHESTRATOR (MTM ENGINE ONLINE)!")

LIVE_TICKS = {}
global_fyers_socket = None    
active_ws_symbols = []        
SUBSCRIBED_SYMBOLS = []
TIME_OFFSET = 0.0 
EXCHANGE_TIME = time.time() 

from collections import OrderedDict
TELEGRAM_ERROR_LOG = OrderedDict()
ERROR_COOLDOWN_SECONDS = 60

ACTIVE_ROUTING_LOCKS = set()
SYSTEM_HALTED = False

def sync_exchange_clock():
    global TIME_OFFSET
    try:
        res = requests.get("https://api-t1.fyers.in/api/v3", timeout=3)
        server_time = parsedate_to_datetime(res.headers['Date']).timestamp()
        TIME_OFFSET = server_time - time.time()
    except Exception: pass

def get_real_now():
    global EXCHANGE_TIME
    return datetime.fromtimestamp(EXCHANGE_TIME)

def on_ws_message(message):
    global EXCHANGE_TIME
    try:
        if 'symbol' in message and 'ltp' in message:
            if 'tt' in message:
                try: EXCHANGE_TIME = float(message['tt'])
                except: pass

            LIVE_TICKS[message['symbol']] = {
                'price': float(message['ltp']), 
                'ask': float(message.get('ask', message['ltp'])),
                'bid': float(message.get('bid', message['ltp'])),
                'time': EXCHANGE_TIME
            }
    except: pass

def start_fyers_websocket():
    global global_fyers_socket, active_ws_symbols, SUBSCRIBED_SYMBOLS
    
    symbols_to_track = ["NSE:NIFTYBANK-INDEX", "NSE:NIFTY50-INDEX", "NSE:RELIANCE-EQ"]
    all_trades = database.get_state("active_trades") or {}
    for t in all_trades.values():
        if t.get("status") not in ["COMPLETED", "CLOSED_EOD", "DISARMED", "EXIT_PENDING"]:
            sym = t.get("index_symbol", t.get("target_asset"))
            if sym:
                symbols_to_track.append(sym)
            
    active_ws_symbols = list(set(symbols_to_track))[:40]

    if global_fyers_socket:
        new_syms = [s for s in active_ws_symbols if s not in SUBSCRIBED_SYMBOLS]
        if new_syms:
            try:
                global_fyers_socket.subscribe(symbols=new_syms, data_type="SymbolUpdate")
                SUBSCRIBED_SYMBOLS.extend(new_syms)
            except Exception: pass
        return
        
    try:
        from fyers_apiv3.FyersWebsocket import data_ws
        keys = database.get_keys("FYERS")
        if not keys: return

        access_token = f"{keys['client_id']}:{keys['access_token']}"
        SUBSCRIBED_SYMBOLS = active_ws_symbols.copy()

        global_fyers_socket = data_ws.FyersDataSocket(
            access_token=access_token, log_path="", litemode=True,
            write_to_file=False, reconnect=True, on_message=on_ws_message
        )
        global_fyers_socket.connect()
        global_fyers_socket.subscribe(symbols=SUBSCRIBED_SYMBOLS, data_type="SymbolUpdate")
    except Exception as e: print(f"❌ [WEBSOCKET ERROR] {e}")

def push_telegram_alert(message):
    if "ERROR" in message.upper() or "FATAL" in message.upper() or "CRITICAL" in message.upper():
        error_key = message[:30] 
        now = time.time()
        if error_key in TELEGRAM_ERROR_LOG and (now - TELEGRAM_ERROR_LOG[error_key] < ERROR_COOLDOWN_SECONDS): return 
        TELEGRAM_ERROR_LOG[error_key] = now
        if len(TELEGRAM_ERROR_LOG) > 50: TELEGRAM_ERROR_LOG.popitem(last=False)
    if alerts: alerts.broadcast_setup("MULTI-TURRET", message)

def safe_thread_launcher(target_function, *args):
    def wrapper():
        try: target_function(*args)
        except Exception as e: push_telegram_alert(f"🚨 FATAL THREAD CRASH: {e}")
    threading.Thread(target=wrapper, daemon=True).start()

def release_active_sector(symbol):
    from execution.order_router import SECTOR_MAP
    base_name = symbol.split(":")[1].split("-")[0] if ":" in symbol else symbol
    target_sector = SECTOR_MAP.get(base_name, "UNKNOWN")
    active_state = database.get_state("active_sectors") or []
    if target_sector in active_state:
        active_state.remove(target_sector)
        database.update_state("active_sectors", active_state)

def token_health_daemon():
    global SYSTEM_HALTED
    while True:
        time.sleep(1800) 
        keys = database.get_keys("FYERS")
        if keys:
            try:
                res = requests.get("https://api-t1.fyers.in/api/v3/profile", headers={"Authorization": f"{keys['client_id']}:{keys['access_token']}"})
                if res.status_code == 401:
                    SYSTEM_HALTED = True
                    push_telegram_alert("🚨 CRITICAL: BROKER AUTH EXPIRED! System Halted. Relogin immediately.")
            except: pass

def reconcile_positions():
    exec_modules = {}
    while True:
        try:
            all_trades = database.get_state("active_trades") or {}
            for trade_id, t_data in list(all_trades.items()):
                if t_data.get("status") in ["LIVE", "FAILED_EXECUTION", "COMPLETED", "DISARMED"]:
                    if trade_id in ACTIVE_ROUTING_LOCKS: ACTIVE_ROUTING_LOCKS.remove(trade_id)

                if t_data.get("status") == "EXIT_PENDING":
                    brokers = t_data.get("execution_brokers", ["FYERS"])
                    for broker_name in brokers:
                        keys = database.get_keys(broker_name.upper())
                        if not keys: continue
                        try:
                            if broker_name not in exec_modules:
                                exec_modules[broker_name] = importlib.import_module(f"execution.brokers.{broker_name.lower()}_exec")
                            
                            open_positions = exec_modules[broker_name].get_open_positions(keys)
                            exec_sym = t_data.get("execution_symbol", t_data.get("index_symbol", t_data.get("target_asset")))
                            
                            is_still_open = any(p.get('symbol') == exec_sym for p in open_positions)
                            
                            if not is_still_open:
                                t_data["status"] = "COMPLETED"
                                database.update_single_trade(trade_id, t_data)
                                push_telegram_alert(f"✅ VERIFIED: Ghost exit resolved for {exec_sym}. Position closed.")
                            else:
                                push_telegram_alert(f"⚠️ GHOST POSITION: {exec_sym} is STILL OPEN on Exchange!")
                        except: pass
        except Exception: pass
        time.sleep(10)

def calculate_trade_pnl(trade_state, entry, exit_price, is_demand_trade):
    pts_pnl = (exit_price - entry) if is_demand_trade else (entry - exit_price)
    lots = float(trade_state.get("lots", 1))
    asset_class = trade_state.get("asset_class", "EQUITY")
    index_symbol = trade_state.get("index_symbol", trade_state.get("target_asset", ""))
    
    lot_size = 1
    if asset_class in ["FUTURES", "OPTIONS"]:
        if "BANKNIFTY" in index_symbol: lot_size = 15
        elif "NIFTY" in index_symbol: lot_size = 25
        elif "SENSEX" in index_symbol: lot_size = 10
    
    inr_pnl = pts_pnl * lots * lot_size
    return pts_pnl, inr_pnl

def run_orchestrator():
    global global_fyers_socket, active_ws_symbols, SYSTEM_HALTED
    sync_exchange_clock() 
    try: symbol_master.update_expiry_cache()
    except: pass

    threading.Thread(target=start_fyers_websocket, daemon=True).start()
    threading.Thread(target=reconcile_positions, daemon=True).start()
    threading.Thread(target=token_health_daemon, daemon=True).start()
    time.sleep(3)
    
    market_open = datetime_time(9, 16) 
    market_close = datetime_time(15, 30)
    
    while True:
        try:
            if SYSTEM_HALTED:
                time.sleep(5)
                continue

            now = get_real_now().time() 
            
            current_date_str = get_real_now().strftime("%Y-%m-%d")
            reset_flag = database.get_state("morning_reset_done")
            
            if now >= datetime_time(9, 0) and str(reset_flag) != current_date_str:
                print(f"🧹 [MAINTENANCE] Performing daily database wipe for {current_date_str}...")
                sync_exchange_clock() 
                database.update_state("active_trades", {})
                database.update_state("active_sectors", [])
                ACTIVE_ROUTING_LOCKS.clear()
                
                current_radar = database.get_state("radar")
                if current_radar:
                    current_radar["signals"] = [] 
                    database.update_state("radar", current_radar)
                    
                database.wal_checkpoint() 
                database.update_state("morning_reset_done", current_date_str)
                time.sleep(2) 
                continue

            health = database.get_state("system_health")
            if health and (not health.get("internet", False) or health.get("fyers_status") == "EXPIRED"):
                time.sleep(2)
                continue

            if not (market_open <= now <= market_close):
                time.sleep(1) 
                continue

            all_trades = database.get_state("active_trades") or {}
            
            needed_symbols = ["NSE:NIFTY50-INDEX", "NSE:NIFTYBANK-INDEX"]
            for t in all_trades.values():
                if t.get("status") not in ["COMPLETED", "CLOSED_EOD", "DISARMED", "EXIT_PENDING"]:
                    sym = t.get("index_symbol", t.get("target_asset"))
                    if sym: needed_symbols.append(sym)
            
            new_symbols = [s for s in set(needed_symbols) if s not in active_ws_symbols]
            if new_symbols: start_fyers_websocket()

            for trade_id, trade_state in list(all_trades.items()):
                status = trade_state.get("status")
                
                if status in ["COMPLETED", "CLOSED_EOD", "DISARMED", "EXIT_PENDING", "ROUTING_PENDING"]:
                    continue 

                index_symbol = trade_state.get("index_symbol", trade_state.get("target_asset", "UNKNOWN_ASSET"))
                is_paper_trade = trade_state.get("is_paper", True) 
                
                tick_data = LIVE_TICKS.get(index_symbol, None)
                if not tick_data: continue

                if time.time() - tick_data['time'] > 45.0:
                    nifty_tick = LIVE_TICKS.get("NSE:NIFTY50-INDEX", {})
                    if not nifty_tick or (time.time() - nifty_tick.get('time', 0)) > 10.0:
                        global_fyers_socket = None
                        start_fyers_websocket()
                        time.sleep(5.0)
                        break

                if status == "FORCE_EXIT":
                    if not is_paper_trade: 
                        aggressive_exit = tick_data['bid'] * 0.97 if "BULLISH" in trade_state.get("setup_type", "BULLISH") else tick_data['ask'] * 1.03
                        safe_thread_launcher(close_live_position, index_symbol, aggressive_exit)
                        trade_state["status"] = "EXIT_PENDING"
                    else:
                        trade_state["status"] = "DISARMED"
                        
                    release_active_sector(index_symbol)
                    trade_state["exit_reason"] = "MANUAL FORCE EXIT"
                    database.update_state("active_sectors", []) 
                    database.update_single_trade(trade_id, trade_state)
                    continue

                # 🚨 BACKEND FIX 1: Map BOTH UI payload formats to prevent ZeroDivisionError Crash
                entry = float(trade_state.get("index_trigger_price", trade_state.get("entry_price", 0)))
                sl = float(trade_state.get("index_sl", trade_state.get("sl_price", 0)))
                target = float(trade_state.get("index_target", trade_state.get("target_price", 0)))
                
                if entry <= 0: continue # Failsafe

                is_demand_trade = target > entry
                direction_str = trade_state.get("setup_direction", "LONG" if is_demand_trade else "SHORT")
                
                trigger_spot = tick_data['ask'] if is_demand_trade else tick_data['bid']
                exit_spot = tick_data['bid'] if is_demand_trade else tick_data['ask']

                if status == "LIVE":
                    r_exit = round(exit_spot, 2)
                    r_target = round(target, 2)
                    r_sl = round(sl, 2)
                    
                    # 🚨 BACKEND FIX 2: Live MTM Engine (Throttled update for UI)
                    last_update = trade_state.get("last_pnl_update_time", 0)
                    if time.time() - last_update > 2.0:
                        pts_pnl, inr_pnl = calculate_trade_pnl(trade_state, entry, r_exit, is_demand_trade)
                        trade_state["unrealized_pnl"] = inr_pnl
                        trade_state["unrealized_pts"] = pts_pnl
                        trade_state["live_price"] = r_exit
                        trade_state["last_pnl_update_time"] = time.time()
                        database.update_single_trade(trade_id, trade_state)

                    hit_target = (is_demand_trade and r_exit >= r_target) or (not is_demand_trade and r_exit <= r_target)
                    hit_sl = (is_demand_trade and r_exit <= r_sl) or (not is_demand_trade and r_exit >= r_sl)
                    
                    if hit_target or hit_sl:
                        reason = "TARGET HIT 🎯" if hit_target else "STOP LOSS HIT 🛑"
                        formatted_exec_time = datetime.fromtimestamp(EXCHANGE_TIME).strftime('%H:%M:%S')
                        
                        pts_pnl, inr_pnl = calculate_trade_pnl(trade_state, entry, r_exit, is_demand_trade)
                        pnl_str = f"+₹{inr_pnl:.2f}" if inr_pnl > 0 else f"-₹{abs(inr_pnl):.2f}"
                        
                        distance_to_sl = abs(exit_spot - sl) / sl if sl > 0 else 0
                        if hit_sl and distance_to_sl > 0.005: 
                            safe_exit_limit = exit_spot * 0.97 if is_demand_trade else exit_spot * 1.03
                            reason = "SL HIT (FREEFALL PANIC) 🛑"
                            push_telegram_alert(f"🚨 BLACKHOLE GAP DETECTED on {index_symbol}. Firing Deep Limit Exit.")
                        else:
                            execution_buffer = exit_spot * 0.002
                            safe_exit_limit = exit_spot - execution_buffer if is_demand_trade else exit_spot + execution_buffer

                        if not is_paper_trade: 
                            safe_thread_launcher(close_live_position, index_symbol, round(safe_exit_limit, 2))
                            trade_state["status"] = "EXIT_PENDING"
                        else:
                            trade_state["status"] = "COMPLETED"
                            
                        release_active_sector(index_symbol)
                        trade_state["exit_reason"] = reason
                        trade_state["exit_price"] = r_exit
                        trade_state["exit_time"] = formatted_exec_time
                        trade_state["realized_pnl"] = inr_pnl
                        trade_state["realized_pts"] = pts_pnl
                        database.update_single_trade(trade_id, trade_state)
                        
                        push_telegram_alert(f"🏁 CLOSED: {reason} | {direction_str} on {index_symbol} | Exit: ₹{r_exit} | PnL: {pnl_str} ({pts_pnl:.2f} pts) [{formatted_exec_time}]")
                        continue

                    if now >= datetime_time(15, 10):
                        formatted_exec_time = datetime.fromtimestamp(EXCHANGE_TIME).strftime('%H:%M:%S')
                        pts_pnl, inr_pnl = calculate_trade_pnl(trade_state, entry, r_exit, is_demand_trade)
                        pnl_str = f"+₹{inr_pnl:.2f}" if inr_pnl > 0 else f"-₹{abs(inr_pnl):.2f}"

                        if not is_paper_trade: 
                            safe_thread_launcher(close_live_position, index_symbol, exit_spot)
                            trade_state["status"] = "EXIT_PENDING"
                        else:
                            trade_state["status"] = "CLOSED_EOD"
                            
                        release_active_sector(index_symbol)
                        trade_state["exit_reason"] = "EOD SQUARE-OFF ⏱️"
                        trade_state["exit_price"] = r_exit
                        trade_state["exit_time"] = formatted_exec_time
                        trade_state["realized_pnl"] = inr_pnl
                        trade_state["realized_pts"] = pts_pnl
                        database.update_single_trade(trade_id, trade_state)
                        push_telegram_alert(f"🏁 CLOSED: EOD SQUARE-OFF | {direction_str} on {index_symbol} | Exit: ₹{r_exit} | PnL: {pnl_str} ({pts_pnl:.2f} pts) [{formatted_exec_time}]")
                        continue

                    if now >= datetime_time(15, 0) and now < datetime_time(15, 10):
                        risk = abs(entry - sl)
                        reward = (exit_spot - entry) if is_demand_trade else (entry - exit_spot)
                        current_r = reward / risk if risk > 0 else 0
                        if current_r >= 2.0 and not trade_state.get("eod_trailed", False):
                            locked_pts = risk * 1.8
                            new_sl = entry + locked_pts if is_demand_trade else entry - locked_pts
                            trade_state["index_sl"] = round(new_sl, 2)
                            trade_state["eod_trailed"] = True
                            database.update_single_trade(trade_id, trade_state)

                elif status == "SNIPER_WAITING":
                    asset_end_time = get_asset_end_time(index_symbol)
                    
                    if now >= asset_end_time:
                        trade_state["status"] = "DISARMED"
                        trade_state["exit_reason"] = f"TIME GATE CUTOFF ({asset_end_time.strftime('%H:%M')})"
                        database.update_single_trade(trade_id, trade_state)
                        continue

                    zone_violated = (is_demand_trade and trigger_spot <= sl) or (not is_demand_trade and trigger_spot >= sl)
                    if zone_violated:
                        trade_state["status"] = "DISARMED"
                        trade_state["exit_reason"] = "ZONE INVALIDATED"
                        database.update_single_trade(trade_id, trade_state)
                        continue

                    tripwire_crossed = trade_state.get("tripwire_crossed", False)
                    if not tripwire_crossed:
                        if (is_demand_trade and trigger_spot <= entry) or (not is_demand_trade and trigger_spot >= entry):
                            distance_pct = abs(trigger_spot - entry) / entry
                            if distance_pct > 0.02: 
                                trade_state["status"] = "DISARMED"
                                trade_state["exit_reason"] = "MASSIVE GAP AVOIDED"
                                database.update_single_trade(trade_id, trade_state)
                                continue

                            trade_state["tripwire_crossed"] = True
                            trade_state["micro_pivot"] = entry 
                            trade_state["zone_extreme"] = trigger_spot
                            database.update_single_trade(trade_id, trade_state)
                            continue 

                    if tripwire_crossed:
                        choch_triggered = False
                        tracked_pivot = float(trade_state["micro_pivot"])
                        zone_extreme = float(trade_state["zone_extreme"])
                        extreme_updated = False
                        
                        if is_demand_trade:
                            if trigger_spot < zone_extreme:
                                if abs(zone_extreme - trigger_spot) > 1.0: 
                                    trade_state["zone_extreme"] = trigger_spot; extreme_updated = True
                            elif trigger_spot >= tracked_pivot and tracked_pivot > zone_extreme:
                                choch_triggered = True
                        else:
                            if trigger_spot > zone_extreme:
                                if abs(trigger_spot - zone_extreme) > 1.0: 
                                    trade_state["zone_extreme"] = trigger_spot; extreme_updated = True
                            elif trigger_spot <= tracked_pivot and tracked_pivot < zone_extreme:
                                choch_triggered = True
                                
                        if extreme_updated: 
                            database.update_single_trade(trade_id, trade_state)

                        if choch_triggered:
                            if trade_id in ACTIVE_ROUTING_LOCKS: continue
                            ACTIVE_ROUTING_LOCKS.add(trade_id)

                            asset_class = trade_state.get("asset_class", "EQUITY").upper()
                            execution_buffer = trigger_spot * 0.002 
                            safe_limit_price = trigger_spot + execution_buffer if is_demand_trade else trigger_spot - execution_buffer
                            formatted_exec_time = datetime.fromtimestamp(EXCHANGE_TIME).strftime('%H:%M:%S')
                            
                            trade_state["setup_direction"] = "LONG" if is_demand_trade else "SHORT"

                            setup_details = {
                                "symbol": index_symbol, "setup_type": trade_state["setup_direction"],
                                "asset_class": asset_class, "entry_price": round(safe_limit_price, 2),
                                "sl": float(trade_state["zone_extreme"]), "target_price": target,
                                "ask": tick_data['ask'], "bid": tick_data['bid']
                            }
                            
                            trade_state["execution_time"] = formatted_exec_time
                            trade_state["index_trigger_price"] = round(trigger_spot, 2)
                            trade_state["index_sl"] = float(trade_state["zone_extreme"])

                            zone_bot = min(entry, sl)
                            zone_top = max(entry, sl)
                            alert_msg = f"LIMIT PLACED: {index_symbol}\nDirection: {trade_state['setup_direction']}\nEntry: ₹{round(safe_limit_price, 2)}\nZone: {zone_bot} to {zone_top}\nSL: ₹{trade_state['index_sl']} \nTime: {formatted_exec_time}"

                            if is_paper_trade:
                                trade_state["status"] = "LIVE"
                                database.update_single_trade(trade_id, trade_state)
                                push_telegram_alert(f"👻 PAPER {alert_msg}")
                            else:
                                trade_state["status"] = "ROUTING_PENDING"
                                database.update_single_trade(trade_id, trade_state)
                                push_telegram_alert(f"🔥 LIVE {alert_msg}")
                                safe_thread_launcher(broadcast_order, setup_details)

        except Exception as e: pass
        time.sleep(0.05) 

if __name__ == "__main__":
    run_orchestrator()