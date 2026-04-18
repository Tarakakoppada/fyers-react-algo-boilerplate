import tempfile
import requests
from fyers_apiv3 import fyersModel

def get_fyers_instance(keys):
    temp_log_dir = tempfile.gettempdir()
    return fyersModel.FyersModel(
        client_id=keys["client_id"], 
        is_async=False, 
        token=keys["access_token"], 
        log_path=temp_log_dir
    )

def fetch_live_margin(keys):
    """
    Out-of-the-box fix: Bypasses the SDK and hits the Fyers API directly.
    This prevents silent SDK crashes and gives explicit error messages.
    """
    # The REST API requires the App ID (usually client_id without the '-100' part if present)
    app_id = keys["client_id"].split('-')[0] if '-' in keys["client_id"] else keys["client_id"]
    access_token = keys["access_token"]
    
    headers = {
        "Authorization": f"{app_id}:{access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get("https://api-t1.fyers.in/api/v3/funds", headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("s") == "ok" and "fund_limit" in data:
                for item in data["fund_limit"]:
                    if item["title"] == "Available Balance":
                        return float(item["equityAmount"])
            raise Exception(f"Fyers API returned unexpected data structure: {data}")
        elif response.status_code == 401:
            raise Exception("Unauthorized: Your Fyers Token is expired. Please re-login in the Vault.")
        else:
            raise Exception(f"Fyers API HTTP Error {response.status_code}: {response.text}")
            
    except requests.exceptions.Timeout:
        raise Exception("Fyers API timed out. Exchange might be down.")
    except Exception as e:
        raise Exception(f"Failed to fetch Fyers margin: {str(e)}")

def place_bracket_order(setup_details, keys):
    fyers = get_fyers_instance(keys)
    symbol = setup_details.get("symbol")
    qty = setup_details.get("calculated_qty", 1) 
    
    limit_price = float(setup_details.get("entry_price"))
    stop_loss = float(setup_details.get("sl"))
    target = float(setup_details.get("target_price"))
    
    data = {
        "symbol": symbol,
        "qty": qty,
        "type": 1,  
        "side": 1 if "BULLISH" in setup_details.get("setup_type", "") else -1,
        "productType": "BO", 
        "limitPrice": limit_price, 
        "stopLoss": stop_loss,
        "takeProfit": target, 
        "validity": "DAY",
        "offlineOrder": False
    }
    
    response = fyers.place_order(data=data)
    if response.get("s") != "ok":
        raise Exception(f"Fyers API Error: {response}")
    return response