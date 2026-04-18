import importlib
import sys
import os
import time
import math
import calendar
import uuid
import decimal
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import database

SECTOR_MAP = {
    "NIFTYBANK": "FINANCIAL", 
    "HDFCBANK": "FINANCIAL",
    "ICICIBANK": "FINANCIAL", 
    "RELIANCE": "COMMODITY_ENERGY", 
    "HINDALCO": "COMMODITY_ENERGY",
    "HAL": "DEFENSE_INDUSTRIAL", 
    "TATAMOTORS": "DEFENSE_INDUSTRIAL", 
    "NIFTY50": "BROAD_MARKET"
}

NSE_LOT_SIZES = {
    "BANKNIFTY": 15, 
    "NIFTY": 25, 
    "RELIANCE": 250, 
    "HDFCBANK": 550, 
    "ICICIBANK": 700, 
    "HINDALCO": 1400, 
    "HAL": 300,
    "TATAMOTORS": 1425 
}

def check_correlation_veto(symbol):
    base_name = symbol.split(":")[1].split("-")[0] if ":" in symbol else symbol
    target_sector = SECTOR_MAP.get(base_name, "UNKNOWN")
    active_state = database.get_state("active_sectors") or []
    return (target_sector in active_state and target_sector != "UNKNOWN")

def register_active_sector(symbol):
    base_name = symbol.split(":")[1].split("-")[0] if ":" in symbol else symbol
    target_sector = SECTOR_MAP.get(base_name, "UNKNOWN")
    active_state = database.get_state("active_sectors") or []
    if target_sector not in active_state and target_sector != "UNKNOWN":
        active_state.append(target_sector)
        database.update_state("active_sectors", active_state)

def round_to_tick(price, tick_size=0.05):
    """
    🚨 PHASE 2 FIX: Perfect Tick Size rounding for Indian NSE (0.05).
    Eliminates Error 16405 (Price not a multiple of tick size).
    """
    price_dec = decimal.Decimal(str(price))
    tick_dec = decimal.Decimal(str(tick_size))
    # Quantize to 2 decimal places to guarantee perfect Fyers compatibility
    rounded = (price_dec / tick_dec).quantize(decimal.Decimal('1'), rounding=decimal.ROUND_HALF_UP) * tick_dec
    return float(rounded)

def get_smart_futures_expiry(base_name="BANKNIFTY"):
    now = datetime.now()
    last_day = calendar.monthrange(now.year, now.month)[1]
    expiries = database.get_state("live_expiries")
    if (last_day - now.day) <= 5:
        return expiries.get(f"{base_name}_NEXT", "24JUN") 
    return expiries.get(base_name, "24MAY")

def translate_signal(setup_details):
    asset_class = setup_details.get("asset_class", "EQUITY").upper()
    raw_symbol = setup_details.get("symbol", "")
    entry = float(setup_details.get("entry_price", 0))
    sl = float(setup_details.get("sl", 0))
    target = float(setup_details.get("target_price", 0))
    is_long = "BULLISH" in setup_details.get("setup_type", "BULLISH").upper()
    
    spot_risk_pts = abs(entry - sl)
    limit_buffer = spot_risk_pts * 0.10 
    entry_chase_buffer = spot_risk_pts * 0.05 
    
    translated = setup_details.copy()
    base_name = raw_symbol.split(":")[1].split("-")[0] if ":" in raw_symbol else raw_symbol
    base_name = base_name.replace("NIFTYBANK", "BANKNIFTY").replace("NIFTY50", "NIFTY")

    if asset_class == "EQUITY":
        translated["execution_symbol"] = raw_symbol
        translated["exec_leverage"] = 5  
        translated["lot_size"] = 1 
    elif asset_class == "FUTURES":
        expiry = get_smart_futures_expiry(base_name)
        translated["execution_symbol"] = f"NSE:{base_name}{expiry}FUT"
        translated["exec_leverage"] = 1  
        translated["lot_size"] = NSE_LOT_SIZES.get(base_name, 1)

    translated["asset_class_translated"] = asset_class
    translated["exec_entry"] = round_to_tick(entry)
    translated["exec_entry_limit"] = round_to_tick(entry + entry_chase_buffer) if is_long else round_to_tick(entry - entry_chase_buffer)
    translated["exec_sl"] = round_to_tick(sl)
    translated["exec_sl_limit"] = round_to_tick(sl - limit_buffer) if is_long else round_to_tick(sl + limit_buffer)
    translated["exec_target"] = round_to_tick(target)
    translated["exec_atr"] = round_to_tick(spot_risk_pts)
    return translated

def calculate_institutional_qty(total_account_cash, exec_price, exec_atr, max_concurrent_trades, max_risk_pct, lot_size, asset_class):
    # SENIOR DEV FIX: Proper Derivative Margin & Risk Math
    max_margin_per_trade = (total_account_cash / max(1, max_concurrent_trades)) * 0.95 
    max_risk_inr_per_trade = total_account_cash * max_risk_pct

    if asset_class == "FUTURES":
        # SPAN Margin is roughly 12% of Contract Value
        contract_value = exec_price * lot_size
        estimated_margin_per_lot = contract_value * 0.12
        max_margin_lots = math.floor(max_margin_per_trade / estimated_margin_per_lot) if estimated_margin_per_lot > 0 else 0

        risk_per_lot_inr = exec_atr * lot_size
        max_risk_lots = math.floor(max_risk_inr_per_trade / risk_per_lot_inr) if risk_per_lot_inr > 0 else max_margin_lots

        final_lots = max(0, min(max_margin_lots, max_risk_lots))
        return final_lots * lot_size
    else:
        # Equity Logic
        total_buying_power = max_margin_per_trade * 5 # 5x Leverage
        max_margin_shares = math.floor(total_buying_power / exec_price) if exec_price > 0 else 0
        max_risk_shares = math.floor(max_risk_inr_per_trade / exec_atr) if exec_atr > 0 else max_margin_shares
        return max(0, min(max_margin_shares, max_risk_shares))

def close_live_position(symbol, exit_limit_price=None):
    print(f"📡 [ROUTER] Broadcasting EMERGENCY SQUARE-OFF for {symbol} at Limit ~{exit_limit_price}")
    brokers = database.get_state("trade").get("execution_brokers", ["FYERS"])
    for broker_name in brokers:
        keys = database.get_keys(broker_name.upper())
        if keys:
            try:
                exec_module = importlib.import_module(f"execution.brokers.{broker_name.lower()}_exec")
                exec_module.exit_all_positions(keys, limit_price=exit_limit_price) 
            except Exception as e:
                pass

def broadcast_order(setup_details):
    trade_state = database.get_state("trade")
    raw_symbol = setup_details.get("symbol", "")
    
    if check_correlation_veto(raw_symbol):
        trade_state["status"] = "VETOED_CORRELATION"
        database.update_state("trade", trade_state)
        return

    ask_price = float(setup_details.get("ask", setup_details["entry_price"]))
    bid_price = float(setup_details.get("bid", setup_details["entry_price"]))
    spread_pct = abs(ask_price - bid_price) / ask_price if ask_price > 0 else 0
    
    if spread_pct > 0.002: 
        print(f"🛑 [ROUTER] Illiquid Spread ({spread_pct*100:.2f}%). Execution Vetoed.")
        trade_state["status"] = "VETOED_ILLIQUID"
        database.update_state("trade", trade_state)
        return

    execution_brokers = trade_state.get("execution_brokers", ["FYERS"]) 
    config = database.get_allocations() or {"total_capital": 500000, "max_risk_pct": 0.02, "allocations": {}}
    translated_setup = translate_signal(setup_details)
    
    MAX_CONCURRENT_TRADES = 4 
    base_capital = config.get("total_capital", 500000)
    intended_risk_inr = base_capital * config.get("max_risk_pct", 0.02)
    dynamic_god_limit = intended_risk_inr * 1.5 

    order_success = False
    panic_abort = False 

    for broker_name in execution_brokers:
        keys = database.get_keys(broker_name.upper())
        if not keys: continue

        try:
            exec_module = importlib.import_module(f"execution.brokers.{broker_name.lower()}_exec")
            
            live_margin = exec_module.fetch_live_margin(keys)
            if live_margin <= 0:
                print(f"⚠️ [{broker_name.upper()}] No live margin available. Skipping.")
                continue
            
            broker_qty = calculate_institutional_qty(
                total_account_cash=base_capital, 
                exec_price=translated_setup["exec_entry"], 
                exec_atr=translated_setup["exec_atr"],
                max_concurrent_trades=MAX_CONCURRENT_TRADES,
                max_risk_pct=config["max_risk_pct"], 
                lot_size=translated_setup["lot_size"],
                asset_class=translated_setup["asset_class_translated"]
            )

            if broker_qty <= 0: 
                print(f"⚠️ [ROUTER] Calculated Qty is 0. Account size too small for {raw_symbol} risk parameters.")
                continue

            projected_risk = (broker_qty / translated_setup["lot_size"]) * (translated_setup["exec_atr"] * translated_setup["lot_size"]) if translated_setup["asset_class_translated"] == "FUTURES" else broker_qty * translated_setup["exec_atr"]
            
            if projected_risk > dynamic_god_limit:
                print(f"🛑 [FATAL] FAT FINGER! Risk ₹{projected_risk:.2f} exceeds Dynamic Circuit Breaker ₹{dynamic_god_limit:.2f}.")
                trade_state["status"] = "VETOED_GOD_LIMIT"
                database.update_state("trade", trade_state)
                return

            broker_payload = translated_setup.copy()
            broker_payload["calculated_qty"] = broker_qty
            broker_payload["symbol"] = broker_payload["execution_symbol"]
            idempotent_key = str(uuid.uuid4())
            broker_payload["order_tag"] = idempotent_key
            
            print(f"\n--- 🚀 FIRING ORDER: {broker_payload['symbol']} (Qty: {broker_qty}) [TAG: {idempotent_key[:8]}] ---")
            
            # 🚨 PHASE 2 FIX: Exponential Backoff & Order Tracking
            order_id = None
            max_attempts = 3
            
            for attempt in range(max_attempts):
                try:
                    # Fire the order
                    order_id = exec_module.place_bracket_order(broker_payload, keys) 
                    break 
                except Exception as net_err:
                    error_msg = str(net_err).lower()
                    if "margin" in error_msg or "fund" in error_msg:
                        print(f"🛑 [FATAL] Margin rejected on attempt {attempt+1}. Aborting completely.")
                        break # Do not retry margin errors, it leads to immediate bans.
                        
                    backoff_time = (2 ** attempt) * 0.5 # 0.5s, 1.0s, 2.0s
                    print(f"⚠️ Network hiccup attempt {attempt+1}: {net_err}. Retrying in {backoff_time}s...")
                    time.sleep(backoff_time)
            
            if order_id:
                # 🚨 PHASE 2 FIX: Capture the exact exchange ID so the Orchestrator isn't blind
                print(f"📡 [ROUTER] Broker accepted order. ID: {order_id}")
                
                # Fetch fresh state in case it changed during our network delay
                fresh_state = database.get_state("trade")
                if fresh_state.get("status") in ["FORCE_EXIT", "DISARMED"]:
                    print("🚨 [ROUTER] PANIC EXIT DETECTED DURING ROUTING! Aborting immediately!")
                    aggressive_exit = bid_price * 0.99 if "BULLISH" in setup_details["setup_type"] else ask_price * 1.01
                    close_live_position(translated_setup["execution_symbol"], exit_limit_price=aggressive_exit)
                    order_success = False
                    panic_abort = True 
                    break 
                
                # Check actual fill status
                time.sleep(1.0) # Give broker 1s to process the fill
                status = exec_module.get_order_status(keys, order_id)
                rejection_reason = exec_module.get_order_rejection_reason(keys, order_id)
                
                if status in ["FILLED", "PARTIALLY_FILLED", "PENDING"]: # Allow PENDING for Limit Orders
                    order_success = True
                    # Attach the order ID to the trade state for future reconciliation
                    trade_state["broker_order_id"] = order_id
                    trade_state["execution_symbol"] = translated_setup["execution_symbol"]
                    break 
                else:
                    print(f"[{broker_name.upper()}] Rejected: {rejection_reason}")
                    
        except Exception as e:
            print(f"[{broker_name.upper()}] Execution Failed: {e}")

    if order_success:
        register_active_sector(raw_symbol)
        trade_state["status"] = "LIVE"
        database.update_state("trade", trade_state)
        print("✅ Trade Verified LIVE in Order Book.")
    elif not panic_abort: 
        if trade_state.get("status") != "VETOED_GOD_LIMIT":
            trade_state["status"] = "FAILED_EXECUTION"
            database.update_state("trade", trade_state)
        print("❌ Trade Failed. Resetting UI.")