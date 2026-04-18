import sys
import os
import multiprocessing
import json
import importlib
import time
import shutil
import pandas as pd
from datetime import datetime
import asyncio 
import uvicorn
import requests
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor 
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

if sys.stdout is not None:
    try: sys.stdout.reconfigure(encoding='utf-8')
    except Exception: pass
else:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")

if sys.stderr is not None:
    try: sys.stderr.reconfigure(encoding='utf-8')
    except Exception: pass
else:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from core import database
from core.orchestrator import run_orchestrator
from core.radar_scanner import run_live_scanner
from data_feeds import indian_feed, crypto_feed
from strategies import strat_01_frvp

try:
    from execution.brokers import fyers_exec, dhan_exec, delta_exec
except ImportError:
    pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

process_pool = ThreadPoolExecutor(max_workers=4)

class ArmPayload(BaseModel):
    trading_mode: str
    data_broker: str = "FYERS"              
    active_broker: str = ""
    execution_brokers: list[str] = []   
    market: str = "INDIAN"
    target_asset: str = "NSE:NIFTYBANK-INDEX"
    strategy: str = "strat_01_frvp"
    option_type: str = ""
    lots: int = 1
    entry_price: float 
    sl_price: float
    target_price: float
    asset_class: str = "FUTURES" 

class SpecificTradeAction(BaseModel):
    trade_id: str
    action: str

class TogglePayload(BaseModel):
    action: str
    market: str = "INDIAN"              
    target_asset: str = "NSE:NIFTYBANK-INDEX" 
    data_broker: str = "FYERS"
    watchlist: list[str] = [] 

class FyersExtractPayload(BaseModel):
    client_id: str
    secret_key: str
    redirect_url: str

class StaticKeyPayload(BaseModel):
    broker: str
    client_id: str
    access_token: str

class HistoricalPayload(BaseModel):
    market: str
    target_asset: str
    data_broker: str
    start_date: str
    end_date: str

class AssetAllocation(BaseModel):
    symbol: str
    rrMultiplier: float
    minScore: int
    allocated_funds: float

class AllocationPayload(BaseModel):
    totalCapital: float
    maxRiskPct: float
    assets: list[AssetAllocation]

class MarginPayload(BaseModel):
    broker: str

def system_watchdog():
    print("🐕 [WATCHDOG] Initializing System Health Monitor...")
    while True:
        health_state = {
            "internet": False,
            "fyers_status": "UNKNOWN",
            "last_check": time.time()
        }
        try:
            requests.get("https://1.1.1.1", timeout=3)
            health_state["internet"] = True
        except:
            health_state["internet"] = False
            health_state["fyers_status"] = "OFFLINE"
            database.update_state("system_health", health_state)
            time.sleep(5) 
            continue

        keys = database.get_keys("FYERS")
        if keys and "access_token" in keys:
            try:
                headers = {"Authorization": f"{keys['client_id']}:{keys['access_token']}"}
                res = requests.get("https://api-t1.fyers.in/api/v3/profile", headers=headers, timeout=5)
                if res.status_code == 200:
                    health_state["fyers_status"] = "CONNECTED"
                elif res.status_code in [401, 403, 400]:
                    health_state["fyers_status"] = "EXPIRED"
                else:
                    health_state["fyers_status"] = f"API_ERROR_{res.status_code}"
            except:
                health_state["fyers_status"] = "UNREACHABLE"
        else:
            health_state["fyers_status"] = "MISSING_KEYS"

        database.update_state("system_health", health_state)
        time.sleep(15)

@app.get("/api/health")
def get_system_health():
    state = database.get_state("system_health")
    if not state: return {"internet": False, "fyers_status": "BOOTING"}
    return state

@app.get("/api/stream_state")
async def stream_state(request: Request): 
    async def event_generator():
        last_state = None
        while True:
            if await request.is_disconnected(): break
            current_trades = database.get_state("active_trades") or {}
            current_sectors = database.get_state("active_sectors")
            current_radar = database.get_state("radar")
            
            payload = {"active_trades": current_trades, "active_sectors": current_sectors, "radar": current_radar}
            
            if payload != last_state:
                yield f"data: {json.dumps(payload)}\n\n"
                last_state = payload
            await asyncio.sleep(0.5)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/live_margin")
def get_live_margin(payload: MarginPayload):
    broker = payload.broker.upper()
    keys = database.get_keys(broker)
    if not keys: raise HTTPException(status_code=400, detail=f"Keys not found.")
    try:
        exec_module = importlib.import_module(f"execution.brokers.{broker.lower()}_exec")
        margin = exec_module.fetch_live_margin(keys)
        return {"status": "success", "margin": margin, "broker": broker}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update_allocation")
def sync_allocation(payload: AllocationPayload):
    try:
        allocation_dict = {
            asset.symbol: {"funds": asset.allocated_funds, "rr": asset.rrMultiplier, "minScore": asset.minScore} 
            for asset in payload.assets
        }
        database.update_allocations(payload.totalCapital, payload.maxRiskPct, allocation_dict)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/allocation")
def get_allocation():
    config = database.get_allocations()
    if config: return {"status": "success", "data": config}
    return {"status": "error"}

@app.post("/api/radar/toggle")
def toggle_radar(payload: TogglePayload):
    # 🚨 SENIOR DEV FIX: Fallback to dict prevents NoneType Crash
    radar_state = database.get_state("radar") or {}
    
    # Always safely update watchlist
    radar_state["watchlist"] = payload.watchlist

    if payload.action == "start":
        radar_state["status"] = "ACTIVE"
        radar_state["market"] = payload.market
        radar_state["target_asset"] = payload.target_asset
        radar_state["data_broker"] = payload.data_broker
    else:
        radar_state["status"] = "STANDBY"
        radar_state["armed"] = False  
        
    database.update_state("radar", radar_state)
    return {"status": "success"}

@app.post("/api/arm")
def arm_system(payload: ArmPayload):
    state_data = payload.dict()
    clean_symbol = state_data["target_asset"].replace(":", "_").replace("-", "_")
    trade_id = f"TRD_{clean_symbol}"
    
    new_trade = {
        "status": "SNIPER_WAITING", "trade_id": trade_id, "market": state_data["market"],
        "index_symbol": state_data["target_asset"], "option_symbol": state_data["option_type"],
        "active_broker": " + ".join(state_data["execution_brokers"]), "execution_brokers": state_data["execution_brokers"], 
        "lots": state_data["lots"], "index_trigger_price": state_data["entry_price"], 
        "index_sl": state_data["sl_price"], "index_target": state_data["target_price"],
        "is_paper": payload.trading_mode.upper() == "PAPER", "asset_class": state_data.get("asset_class", "FUTURES"),
        "setup_type": "BULLISH" if state_data["target_price"] > state_data["entry_price"] else "BEARISH"
    }
    all_trades = database.get_state("active_trades") or {}
    all_trades[trade_id] = new_trade
    database.update_state("active_trades", all_trades)
    return {"status": "success"}

@app.post("/api/trade/action")
def specific_trade_action(payload: SpecificTradeAction):
    all_trades = database.get_state("active_trades") or {}
    if payload.trade_id in all_trades:
        if payload.action == "DISARM":
            all_trades[payload.trade_id]["status"] = "DISARMED"
            all_trades[payload.trade_id]["exit_reason"] = "MANUALLY DISARMED"
        elif payload.action == "FORCE_EXIT":
            all_trades[payload.trade_id]["status"] = "FORCE_EXIT"
        elif payload.action == "DISMISS":
            del all_trades[payload.trade_id] 
        database.update_state("active_trades", all_trades)
        return {"status": "success"}
    return {"status": "error"}

@app.post("/api/trade/clear_dead")
def clear_dead_trades():
    all_trades = database.get_state("active_trades") or {}
    living_trades = {tid: tdata for tid, tdata in all_trades.items() if tdata.get("status") not in ["COMPLETED", "CLOSED_EOD", "DISARMED"]}
    database.update_state("active_trades", living_trades)
    return {"status": "success"}

@app.post("/api/disarm")
def disarm_system():
    radar_state = database.get_state("radar")
    if radar_state:
        radar_state["armed"] = False
        database.update_state("radar", radar_state)
    all_trades = database.get_state("active_trades") or {}
    for tid, t_data in all_trades.items():
        if t_data.get("status") in ["SNIPER_WAITING", "ROUTING_PENDING"]:
            all_trades[tid]["status"] = "DISARMED"
            all_trades[tid]["exit_reason"] = "GLOBAL DISARM"
    database.update_state("active_trades", all_trades)
    return {"status": "success"}

@app.post("/api/force-exit")
def force_exit_all_positions():
    try:
        radar_state = database.get_state("radar")
        if radar_state:
            radar_state["armed"] = False
            database.update_state("radar", radar_state)
        all_trades = database.get_state("active_trades") or {}
        for tid, t_data in all_trades.items():
            if t_data.get("status") in ["LIVE", "SNIPER_WAITING", "EXECUTED_PAPER", "ROUTING_PENDING"]:
                all_trades[tid]["status"] = "FORCE_EXIT"
        database.update_state("active_trades", all_trades)
        return {"status": "success"}
    except Exception as e: return {"status": "error"}

@app.get("/api/radar")
def get_radar(): return {"status": "success", "data": database.get_state("radar")}

@app.get("/api/trade")
def get_trade(): return {"status": "success", "data": database.get_state("active_trades") or {}}

def _run_backtest_process(df, target_asset):
    return strat_01_frvp.run_historical_backtest(df, target_asset)

@app.post("/api/analytics/historical-scan")
async def run_historical_scan(payload: HistoricalPayload):
    try:
        start_epoch = int(datetime.strptime(payload.start_date, "%Y-%m-%d").timestamp())
        end_epoch = int(datetime.strptime(payload.end_date, "%Y-%m-%d").timestamp()) + 86399 
        if payload.market == "INDIAN": df = indian_feed.get_candles(payload.target_asset, "5", start_epoch, end_epoch, payload.data_broker)
        else: df = crypto_feed.get_candles(payload.target_asset, "5", start_epoch, end_epoch, payload.data_broker)
        if df is None or df.empty: return {"status": "error", "message": "No data returned."}
        loop = asyncio.get_running_loop()
        ledger = await loop.run_in_executor(process_pool, _run_backtest_process, df, payload.target_asset)
        
        total_trades = len(ledger)
        wins = sum(1 for t in ledger if t["outcome"] == "WIN")
        losses = total_trades - wins
        win_rate = f"{(wins / max(1, total_trades) * 100):.1f}%"
        gross_profit = sum(t["pnl"] for t in ledger if t["pnl"] > 0)
        gross_loss = abs(sum(t["pnl"] for t in ledger if t["pnl"] < 0))
        profit_factor = f"{(gross_profit / max(1, gross_loss)):.2f}" if gross_loss > 0 else "MAX"
        peak, current_equity, max_dd = 0, 0, 0
        for t in ledger:
            current_equity += t["pnl"]
            if current_equity > peak: peak = current_equity
            dd = peak - current_equity
            if dd > max_dd: max_dd = dd
        return {"status": "success", "data": {"metrics": {"win_rate": win_rate, "profit_factor": profit_factor, "max_drawdown": f"{max_dd:.1f} pts", "total_trades": str(total_trades), "wins": str(wins), "losses": str(losses)}, "ledger": ledger}}
    except Exception as e: return {"status": "error", "message": str(e)}

@app.post("/api/analytics/custom-scan")
async def run_custom_scan(file: UploadFile = File(...), target_asset: str = Form("CUSTOM_ASSET")):
    try:
        target_asset = target_asset.strip().upper()
        os.makedirs("data", exist_ok=True)
        file_path = f"data/{file.filename}"
        with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        df = pd.read_csv(file_path)        
        df.columns = [str(col).strip().capitalize() for col in df.columns] 
        column_aliases = {'O': 'Open', 'Open_price': 'Open', 'Open price': 'Open', 'H': 'High', 'High_price': 'High', 'High price': 'High', 'L': 'Low', 'Low_price': 'Low', 'Low price': 'Low', 'C': 'Close', 'Close_price': 'Close', 'Close price': 'Close', 'Ltp': 'Close', 'Price': 'Close', 'V': 'Volume', 'Vol': 'Volume'}
        df.rename(columns=column_aliases, inplace=True)
        possible_time_cols = [c for c in df.columns if 'Date' in c or 'Time' in c]
        time_col = possible_time_cols[0] if possible_time_cols else df.columns[0]
        df.rename(columns={time_col: 'Timestamp'}, inplace=True)
        df['Timestamp'] = pd.to_datetime(df['Timestamp'], format='mixed')
        if df['Timestamp'].dt.tz is not None: df['Timestamp'] = df['Timestamp'].dt.tz_localize(None)
        df.set_index('Timestamp', inplace=True)
        df.sort_index(inplace=True)
        if 'Volume' not in df.columns or df['Volume'].max() == 0:
            df['Volume'] = abs(df['High'] - df['Low']) * 100000
            df['Volume'] = df['Volume'].replace(0, 100)
        loop = asyncio.get_running_loop()
        ledger = await loop.run_in_executor(process_pool, _run_backtest_process, df, target_asset)
        if ledger:
            pd.DataFrame(ledger).to_csv("data/V11_Trade_Ledger.csv", index=False)
        total_trades = len(ledger)
        wins = sum(1 for t in ledger if t["outcome"] == "WIN")
        losses = total_trades - wins
        win_rate = f"{(wins / max(1, total_trades) * 100):.1f}%"
        gross_profit = sum(t["pnl"] for t in ledger if t["pnl"] > 0)
        gross_loss = abs(sum(t["pnl"] for t in ledger if t["pnl"] < 0))
        profit_factor = f"{(gross_profit / max(1, gross_loss)):.2f}" if gross_loss > 0 else "MAX"
        peak, current_equity, max_dd = 0, 0, 0
        for t in ledger:
            current_equity += t["pnl"]
            if current_equity > peak: peak = current_equity
            dd = peak - current_equity
            if dd > max_dd: max_dd = dd
        return {"status": "success", "data": {"metrics": {"win_rate": win_rate, "profit_factor": profit_factor, "max_drawdown": f"{max_dd:.1f} pts", "total_trades": str(total_trades), "wins": str(wins), "losses": str(losses)}, "ledger": ledger}}
    except Exception as e: return {"status": "error", "message": str(e)}

@app.get("/api/analytics/download-ledger")
def download_ledger():
    if os.path.exists("data/V11_Trade_Ledger.csv"): return FileResponse(path="data/V11_Trade_Ledger.csv", filename="V11_Trade_Ledger.csv", media_type="text/csv")
    return {"status": "error"}

@app.get("/api/settings/keys/{broker}")
def get_broker_keys(broker: str):
    keys = database.get_keys(broker.upper())
    if keys: return {"status": "success", "masked_token": keys["access_token"][:6] + "..."}
    return {"status": "error"}

@app.get("/api/settings/fyers/login")
def fyers_login(client_id: str = ""):
    url = f"https://api-t1.fyers.in/api/v3/generate-authcode?client_id={client_id}&redirect_uri=https://127.0.0.1/&response_type=code&state=sample_state"
    return {"status": "success", "url": url}

@app.post("/api/settings/fyers/extract")
def fyers_extract(payload: FyersExtractPayload):
    url = payload.redirect_url
    if "auth_code=" in url:
        auth_code = url.split("auth_code=")[1].split("&")[0]
        try:
            from fyers_apiv3 import fyersModel
            session = fyersModel.SessionModel(client_id=payload.client_id, secret_key=payload.secret_key, redirect_uri="https://127.0.0.1/", response_type="code", grant_type="authorization_code")
            session.set_token(auth_code)
            response = session.generate_token()
            if "access_token" in response:
                database.save_keys("FYERS", payload.client_id, response["access_token"])
                return {"status": "success", "message": "Fyers Handshake Complete."}
        except: pass
    return {"status": "error", "message": "Failed"}

@app.post("/api/settings/keys/save")
def save_static_keys(payload: StaticKeyPayload):
    database.save_keys(payload.broker.upper(), payload.client_id, payload.access_token)
    return {"status": "success"}

@app.get("/api/profiles")
def get_asset_profiles():
    base_path = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
    profile_path = os.path.join(base_path, "data", "asset_profiles.json")
    if os.path.exists(profile_path):
        try:
            with open(profile_path, "r") as f: return json.load(f)
        except: return {}
    return {}

@app.post("/api/profiles")
def save_asset_profiles(profiles: dict):
    base_path = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
    normalized_profiles = {k.strip().upper(): v for k, v in profiles.items()}
    os.makedirs(os.path.join(base_path, "data"), exist_ok=True)
    with open(os.path.join(base_path, "data", "asset_profiles.json"), "w") as f: json.dump(normalized_profiles, f, indent=4)
    return {"status": "success"}

if __name__ == "__main__":
    multiprocessing.freeze_support()
    print("Booting Algo Command Master Server...")
    try:
        if os.path.exists(database.DB_PATH): shutil.copy2(database.DB_PATH, database.DB_PATH.replace(".db", "_backup.db"))
    except: pass
    threading.Thread(target=system_watchdog, daemon=True).start()
    threading.Thread(target=run_orchestrator, daemon=True).start()
    threading.Thread(target=run_live_scanner, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)