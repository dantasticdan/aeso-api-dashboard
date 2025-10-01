#!/usr/bin/env python3
"""
Python-Kasa Bridge for Node.js Integration
This script provides a simple interface for Node.js to control Kasa devices
"""

import asyncio
import json
import sys
from kasa import SmartPlug

class KasaBridge:
    def __init__(self, device_ip):
        self.device_ip = device_ip
        self.plug = SmartPlug(device_ip)
    
    async def get_status(self):
        """Get device status"""
        try:
            await self.plug.update()
            return {
                "success": True,
                "isOn": self.plug.is_on,
                "deviceName": self.plug.alias,
                "host": self.plug.host,
                "lastUpdate": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def turn_on(self):
        """Turn device on"""
        try:
            await self.plug.turn_on()
            return {"success": True, "message": "Device turned on"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def turn_off(self):
        """Turn device off"""
        try:
            await self.plug.turn_off()
            return {"success": True, "message": "Device turned off"}
        except Exception as e:
            return {"success": False, "error": str(e)}

async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python kasa-python-bridge.py <device_ip> <action>"}))
        return
    
    device_ip = sys.argv[1]
    action = sys.argv[2]
    
    bridge = KasaBridge(device_ip)
    
    if action == "status":
        result = await bridge.get_status()
    elif action == "on":
        result = await bridge.turn_on()
    elif action == "off":
        result = await bridge.turn_off()
    else:
        result = {"success": False, "error": f"Unknown action: {action}"}
    
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())
