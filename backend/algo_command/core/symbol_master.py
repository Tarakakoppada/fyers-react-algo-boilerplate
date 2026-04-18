import requests
import pandas as pd
import time
import re
import os
import sys
import io

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import database 

FYERS_MASTER_URL = "https://public.fyers.in/sym_details/NSE_FO.csv"

def update_expiry_cache():
    print("[SYMBOL MASTER] Downloading Fyers NSE_FO.csv...")
    try:
        # SENIOR DEV FIX: Explicit 15-second timeout. Never hang the thread.
        response = requests.get(FYERS_MASTER_URL, timeout=15)
        response.raise_for_status()
        csv_data = io.StringIO(response.text)
    except Exception as e:
        print(f"[SYMBOL MASTER] ERROR: Failed to download or timed out: {e}")
        return

    df = pd.read_csv(csv_data, usecols=[8, 9], header=None, names=["ExpiryEpoch", "SymbolTicker"])
    future_df = df[df["ExpiryEpoch"] > time.time()].copy()
    
    expiry_dict = {}
    assets_to_track = ["BANKNIFTY", "NIFTY", "RELIANCE", "HAL", "HINDALCO", "HDFCBANK"]

    for asset in assets_to_track:
        asset_df = future_df[future_df['SymbolTicker'].str.contains(f"NSE:{asset}.*FUT$", regex=True)].copy()
        
        if not asset_df.empty:
            asset_df = asset_df.sort_values(by="ExpiryEpoch")
            
            current_symbol = asset_df.iloc[0]["SymbolTicker"]
            match_curr = re.search(f"NSE:{asset}(.*?)FUT", current_symbol)
            if match_curr:
                expiry_dict[asset] = match_curr.group(1)
                
            if len(asset_df) > 1:
                next_symbol = asset_df.iloc[1]["SymbolTicker"]
                match_next = re.search(f"NSE:{asset}(.*?)FUT", next_symbol)
                if match_next:
                    expiry_dict[f"{asset}_NEXT"] = match_next.group(1)

    database.update_state("live_expiries", expiry_dict)
    print(f"[SYMBOL MASTER] Expiry cache updated for FUTURES: {list(expiry_dict.keys())}")

if __name__ == "__main__":
    update_expiry_cache()