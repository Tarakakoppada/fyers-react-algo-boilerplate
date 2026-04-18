import pandas as pd
import requests
import time

def get_candles(symbol, resolution, start_epoch, end_epoch, broker="BINANCE"):
    """
    Fetches deep historical crypto data directly from Binance.
    Auto-corrects BTCUSD to BTCUSDT and bypasses API limits with chunking.
    """
    symbol = symbol.upper().replace("-", "").replace("/", "")
    if symbol == "BTCUSD": symbol = "BTCUSDT"
    if symbol == "ETHUSD": symbol = "ETHUSDT"

    all_klines = []
    
    current_start = int(start_epoch * 1000)
    end_ts = int(end_epoch * 1000)

    while current_start < end_ts:
        url = "https://api.binance.com/api/v3/klines"
        params = {
            "symbol": symbol,
            "interval": "5m" if resolution == "5" else resolution + "m",
            "startTime": current_start,
            "endTime": end_ts,
            "limit": 1000
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if isinstance(data, dict) and 'msg' in data:
                print(f"⚠️ Binance Error: {data['msg']}")
                break
                
            if not data:
                break
                
            all_klines.extend(data)
            current_start = data[-1][6] + 1
            time.sleep(0.2) 
            
        except Exception as e:
            print(f"🚨 Crypto Feed Error: {e}")
            break

    if not all_klines:
        return pd.DataFrame()

    columns = ['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume', 
               'CloseTime', 'QAV', 'Trades', 'TBB', 'TBQ', 'Ignore']
    
    df = pd.DataFrame(all_klines, columns=columns)
    df = df[['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume']]
    
    for c in ['Open', 'High', 'Low', 'Close', 'Volume']:
        df[c] = df[c].astype(float)
        
    df['Timestamp'] = pd.to_datetime(df['Timestamp'], unit='ms')
    df.set_index('Timestamp', inplace=True)
    
    return df