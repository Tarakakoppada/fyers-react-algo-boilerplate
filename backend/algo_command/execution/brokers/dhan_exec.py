def fetch_live_margin(keys):
    from dhanhq import dhanhq
    try:
        dhan = dhanhq(keys["client_id"], keys["access_token"])
        response = dhan.get_fund_limits()
        
        # Dhan returns margin inside a nested 'data' dictionary. 
        if 'data' in response and 'availabelBalance' in response['data']:
            return float(response['data']['availabelBalance'])
        
        raise Exception(f"Unexpected Dhan response structure: {response}")
    except Exception as e:
        raise Exception(f"Failed to fetch Dhan margin: {str(e)}")

def place_bracket_order(setup_details, keys):
    from dhanhq import dhanhq
    dhan = dhanhq(keys["client_id"], keys["access_token"])
    
    symbol = setup_details.get("symbol")
    
    # Pull dynamically calculated quantity from the Order Router
    qty = setup_details.get("calculated_qty", 1) 
    
    transaction_type = dhan.BUY if "BULLISH" in setup_details.get("setup_type", "") else dhan.SELL
    
    entry_price = float(setup_details.get("entry_price"))
    stop_loss = float(setup_details.get("sl"))
    target = float(setup_details.get("target_price"))
    
    # Dhan Bracket Orders require absolute point differences, not the actual price levels
    bo_sl_points = round(abs(entry_price - stop_loss), 2)
    bo_target_points = round(abs(target - entry_price), 2)
    
    response = dhan.place_order(
        security_id=symbol,  # NOTE: Dhan often requires numerical security IDs (e.g., '1333' for HDFC). You may need a mapping function here later.
        exchange_segment=dhan.NSE,
        transaction_type=transaction_type,
        quantity=qty,
        order_type=dhan.LIMIT,
        product_type=dhan.BO, 
        price=entry_price,
        bo_profit_value=bo_target_points, 
        bo_stop_loss_Value=bo_sl_points
    )
    
    if response.get("status") != "success":
        raise Exception(f"Dhan API Error: {response}")
        
    return response