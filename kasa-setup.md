# Kasa Smart Switch Integration Setup

This guide will help you set up your Kasa smart switch to be controlled by AESO API data.

## Prerequisites

1. **Kasa Smart Switch** - Any TP-Link Kasa compatible device
2. **Node.js** - Version 14 or higher
3. **Network Access** - Your computer and Kasa device must be on the same network

## Step 1: Find Your Kasa Device IP Address

### Method 1: Using Kasa App
1. Open the Kasa app on your phone
2. Go to your device settings
3. Look for the IP address in device information

### Method 2: Using Network Scanner
```bash
# On Windows (PowerShell)
arp -a | findstr "192.168"

# On Mac/Linux
arp -a | grep "192.168"
```

### Method 3: Using Router Admin Panel
1. Access your router's admin panel (usually 192.168.1.1 or 192.168.0.1)
2. Look for connected devices
3. Find your Kasa device by name

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Kasa Device Configuration
KASA_DEVICE_IP=192.168.1.100

# AESO API Configuration
AESO_API_KEY=your_aeso_api_key_here

# Server Configuration
PORT=3001
```

Replace `192.168.1.100` with your actual Kasa device IP address.

## Step 4: Test the Connection

### Start the Server
```bash
npm start
```

### Test API Endpoints

1. **Check Status:**
```bash
curl http://localhost:3001/api/status
```

2. **Get Current Price:**
```bash
curl http://localhost:3001/api/price
```

3. **Turn Switch On:**
```bash
curl -X POST http://localhost:3001/api/switch/on
```

4. **Turn Switch Off:**
```bash
curl -X POST http://localhost:3001/api/switch/off
```

## Step 5: Configure Automation

### Set Price Thresholds
```bash
curl -X POST http://localhost:3001/api/automation/config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "lowThreshold": 5.0,
    "highThreshold": 15.0
  }'
```

### Run Automation Manually
```bash
curl -X POST http://localhost:3001/api/automation/run
```

## Step 6: Integration with Your Dashboard

Add this to your `script.js` to integrate with the existing dashboard:

```javascript
// Kasa Integration
class KasaIntegration {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.switchStatus = null;
    }

    async getSwitchStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/status`);
            const data = await response.json();
            this.switchStatus = data.device;
            return data;
        } catch (error) {
            console.error('Error getting switch status:', error);
            return null;
        }
    }

    async toggleSwitch() {
        try {
            const endpoint = this.switchStatus?.isOn ? 'off' : 'on';
            const response = await fetch(`${this.apiBaseUrl}/switch/${endpoint}`, {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                await this.getSwitchStatus(); // Refresh status
            }
            
            return result;
        } catch (error) {
            console.error('Error toggling switch:', error);
            return { success: false, error: error.message };
        }
    }

    async runAutomation() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/automation/run`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Error running automation:', error);
            return { success: false, error: error.message };
        }
    }
}

// Add to your existing dashboard
window.kasaIntegration = new KasaIntegration();
```

## Troubleshooting

### Common Issues

1. **Device Not Found**
   - Ensure your Kasa device is on the same network
   - Check the IP address is correct
   - Try restarting your router

2. **Connection Timeout**
   - Check if the device IP is correct
   - Ensure no firewall is blocking port 9999
   - Try pinging the device: `ping 192.168.1.100`

3. **API Errors**
   - Verify your AESO API key is correct
   - Check if the AESO API is accessible
   - Ensure the device is powered on

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## Automation Logic

The system will automatically:
- **Turn ON** the switch when electricity price is below the low threshold
- **Turn OFF** the switch when electricity price is above the high threshold
- **Do nothing** when price is between thresholds

## Security Notes

- The Kasa device communicates over your local network
- No data is sent to external servers (except AESO API)
- API keys should be kept secure
- Consider using HTTPS in production

## Next Steps

1. Test the basic functionality
2. Configure your price thresholds
3. Enable automation
4. Monitor the system for a few days
5. Adjust thresholds based on your usage patterns
