# core/alerts.py
import requests
import threading
import os
import sys

# Ensure core module is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import database

# Try to load Windows desktop notifications
try:
    from plyer import notification
    HAS_DESKTOP_ALERTS = True
except ImportError:
    HAS_DESKTOP_ALERTS = False

def _send_telegram_async(bot_token, chat_id, title, message):
    """Fires the HTTP request to Telegram in a background thread."""
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": f"*{title}*\n\n{message}",
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            print("✅ Telegram Alert Successfully Broadcasted.")
        else:
            print(f"🚨 TELEGRAM REJECTED ALERT: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"🚨 ALERT PIPELINE NETWORK FAILURE: {e}")

def broadcast_setup(title, message):
    """
    Dispatches alerts to both Windows Desktop and Telegram.
    Called by Radar and Orchestrator.
    """
    # ==========================================
    # 1. FIRE WINDOWS DESKTOP NOTIFICATION
    # ==========================================
    if HAS_DESKTOP_ALERTS:
        try:
            # Strip markdown for the desktop popup UI
            clean_msg = message.replace("**", "").replace("*", "")
            notification.notify(
                title=f"Algo Command: {title}",
                message=clean_msg[:250], # Windows max length
                app_name="Algo Command",
                timeout=7
            )
        except Exception:
            pass
            
    # ==========================================
    # 2. FIRE TELEGRAM MOBILE ALERT
    # ==========================================
    # 🚨 SENIOR DEV FIX: Look in the Vault using get_keys, not get_state!
    keys = database.get_keys("TELEGRAM")
    
    if keys and keys.get("client_id") and keys.get("access_token"):
        chat_id = keys["client_id"] # We stored Chat ID as client_id
        bot_token = keys["access_token"] # We stored Bot Token as access_token
        
        # Fire and forget in a separate thread so we don't block the trading loop!
        threading.Thread(
            target=_send_telegram_async, 
            args=(bot_token, chat_id, title, message), 
            daemon=True
        ).start()
    else:
        print("⚠️ [ALERTS] Telegram keys missing from Vault. Dropping message.")