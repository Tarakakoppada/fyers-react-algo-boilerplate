import sys
import os
import time
import tempfile
import pandas as pd
from fyers_apiv3 import fyersModel
from dhanhq import dhanhq

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import database

def fetch_fyers_historical(symbol, keys, timeframe, start_epoch, end_epoch):
    client_id = keys["client_id"]
    access_token = keys["access_token"]
    
    temp_log_dir = tempfile.gettempdir()
    fyers = fyersModel.FyersModel(client_id=client_id, is_async=False, token=access_token, log_path=temp_log_dir)

    df_list = []
    chunk_size = 60 * 24 * 60 * 60 
    current_start = start_epoch

    while current_start < end_epoch:
        current_end = min(current_start + chunk_size, end_epoch)
        
        s_date = time.strftime('%Y-%m-%d', time.localtime(current_start))
        e_date = time.strftime('%Y-%m-%d', time.localtime(current_end))
        
        data = {
            "symbol": symbol,
            "resolution": str(timeframe),
            "date_format": "1",
            "range_from": s_date,
            "range_to": e_date,
            "cont_flag": "1"
        }
        
        try:
            response = fyers.history(data=data)
            
            # THE ERROR BUBBLING FIX
            if response.get("s") == "ok" and "candles" in response:
                if len(response["candles"]) > 0:
                    chunk_df = pd.DataFrame(response["candles"], columns=['epoch', 'Open', 'High', 'Low', 'Close', 'Volume'])
                    df_list.append(chunk_df)
            elif response.get("s") == "error":
                error_msg = response.get("message", "Unknown API Rejection")
                raise Exception(f"Fyers Rejected Request: {error_msg}")
                
        except Exception as e:
            raise Exception(f"Data Connection Failed | {e}")
            
        current_start = current_end + 86400 
        time.sleep(0.3) 

    if not df_list:
        return pd.DataFrame()

    master_df = pd.concat(df_list, ignore_index=True)
    master_df.drop_duplicates(subset=['epoch'], inplace=True)
    master_df.sort_values('epoch', inplace=True)
    
    master_df['Timestamp'] = pd.to_datetime(master_df['epoch'], unit='s') + pd.Timedelta(hours=5, minutes=30)
    master_df.set_index('Timestamp', inplace=True)
    
    return master_df


def fetch_dhan_historical(symbol, keys, timeframe, start_epoch, end_epoch):
    client_id = keys["client_id"]
    access_token = keys["access_token"]
    dhan = dhanhq(client_id, access_token)

    exchange = dhan.NSE if "NSE:" in symbol else dhan.BSE
    sec_id = symbol.split(":")[1] if ":" in symbol else symbol

    df_list = []
    chunk_size = 25 * 24 * 60 * 60
    current_start = start_epoch

    while current_start < end_epoch:
        current_end = min(current_start + chunk_size, end_epoch)
        
        s_date = time.strftime('%Y-%m-%d', time.localtime(current_start))
        e_date = time.strftime('%Y-%m-%d', time.localtime(current_end))
        
        try:
            response = dhan.historical_minute_charts(
                symbol=sec_id,
                exchange_segment=exchange,
                instrument_type=dhan.INDEX,
                from_date=s_date,
                to_date=e_date
            )
            
            # THE ERROR BUBBLING FIX
            if response.get("status") == "success" and "data" in response:
                data = response["data"]
                if data and len(data.get("start_Time", [])) > 0:
                    chunk_df = pd.DataFrame({
                        'epoch': data['start_Time'],
                        'Open': data['open'],
                        'High': data['high'],
                        'Low': data['low'],
                        'Close': data['close'],
                        'Volume': data['volume']
                    })
                    df_list.append(chunk_df)
            elif response.get("status") == "failure":
                error_msg = response.get("remarks", "Unknown API Rejection")
                raise Exception(f"Dhan Rejected Request: {error_msg}")
                
        except Exception as e:
            raise Exception(f"Data Connection Failed | {e}")
                
        current_start = current_end + 86400
        time.sleep(0.3)

    if not df_list:
        return pd.DataFrame()

    master_df = pd.concat(df_list, ignore_index=True)
    master_df.drop_duplicates(subset=['epoch'], inplace=True)
    master_df.sort_values('epoch', inplace=True)
    
    master_df['Timestamp'] = pd.to_datetime(master_df['epoch'], unit='s') 
    master_df.set_index('Timestamp', inplace=True)
    
    return master_df


# THE FIX: Accept explicit broker_name from the Historical Payload
def get_candles(symbol, timeframe="5", start_epoch=None, end_epoch=None, broker_name=None):
    
    # Fallback to Database for the Live Radar Orchestrator
    if not broker_name:
        radar_state = database.get_state("radar")
        broker_name = radar_state.get("data_broker", "FYERS").upper()

    keys = database.get_keys(broker_name.upper())
    if not keys:
        raise Exception(f"Keys missing in Vault for Data Feed: {broker_name.upper()}")

    if not end_epoch:
        end_epoch = int(time.time())
    if not start_epoch:
        start_epoch = end_epoch - (5 * 24 * 60 * 60) 

    if broker_name.upper() == "FYERS":
        return fetch_fyers_historical(symbol, keys, timeframe, start_epoch, end_epoch)
    elif broker_name.upper() == "DHAN":
        return fetch_dhan_historical(symbol, keys, timeframe, start_epoch, end_epoch)
    else:
        raise Exception(f"Unrecognized Data Broker: {broker_name}")