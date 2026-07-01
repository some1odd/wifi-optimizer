"""
Wifi Optimizer — Desktop Wi-Fi Optimizer & Diagnostic Tool
Backend powered by Python + Eel
"""

import eel
import time

# ── Initialize Eel ──────────────────────────────────────────────────────────
eel.init("web")


# ── Exposed Python functions ────────────────────────────────────────────────

@eel.expose
def get_wifi_data():
    """
    Return placeholder dummy data for the Wi-Fi connection.
    SSID: 'Scanning...', Signal: '0%', Ping: '0ms'
    """
    return {
        "ssid": "Scanning...",
        "signal": "0%",
        "ping": "0ms"
    }


@eel.expose
def run_optimize():
    """
    Perform diagnostic optimization steps.
    """
    time.sleep(1.2)  # Simulate short latency for visual effect
    return {
        "status": "complete",
        "actions": [
            "DNS cache flushed ✓",
            "IP address renewed ✓",
            "Network sockets reset ✓"
        ]
    }


@eel.expose
def scan_networks():
    """
    Return list of nearby Wi-Fi networks (mock data).
    """
    time.sleep(0.8)  # Simulate scanning latency
    return [
        {"ssid": "Office_Network_5G", "signal": 92, "channel": "44", "auth": "WPA2-Enterprise"},
        {"ssid": "Home_WiFi_Optimum", "signal": 85, "channel": "6", "auth": "WPA2-PSK"},
        {"ssid": "Coffee_Shop_Guest", "signal": 64, "channel": "11", "auth": "Open"},
        {"ssid": "Neighbor_WiFi", "signal": 45, "channel": "1", "auth": "WPA2-PSK"},
        {"ssid": "Public_Transit_Free", "signal": 28, "channel": "149", "auth": "Open"}
    ]


# ── Launch ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    eel.start(
        "index.html",
        size=(900, 600),
        port=0,               # Auto-pick available port
        mode="edge"           # Launch in App mode using Edge Chromium
    )
