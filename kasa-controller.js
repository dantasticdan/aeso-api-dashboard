/**
 * Kasa Smart Switch Controller
 * Integrates with AESO API data to control Kasa smart switches
 */

const axios = require('axios');

class KasaController {
    constructor() {
        this.deviceIP = process.env.KASA_DEVICE_IP || '192.168.1.100'; // Replace with your device IP
        this.devicePort = 9999;
        this.aesoApiKey = process.env.AESO_API_KEY || 'fddc2df776174e96bdb06e06cdaa3052';
        this.aesoBaseUrl = 'https://apimgw.aeso.ca/public/systemmarginalprice-api/v1.1';
        
        // Price threshold for automation (in ¢/kWh)
        this.priceThreshold = 5.0;  // Turn on when price is below this threshold
        
        this.isDeviceOn = false;
        this.lastPrice = null;
        this.automationEnabled = false;
    }

    /**
     * Discover Kasa devices on the network
     */
    async discoverDevices() {
        try {
            // This would require a UDP broadcast to discover devices
            // For now, we'll use the configured IP
            console.log(`Looking for Kasa device at ${this.deviceIP}`);
            return [this.deviceIP];
        } catch (error) {
            console.error('Error discovering devices:', error);
            return [];
        }
    }

    /**
     * Get current AESO System Marginal Price
     */
    async getCurrentPrice() {
        try {
            const response = await axios.get(`${this.aesoBaseUrl}/price/systemMarginalPrice/current`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'API-KEY': this.aesoApiKey
                }
            });

            if (response.data && response.data.return && response.data.return['System Marginal Price Report']) {
                const smpData = response.data.return['System Marginal Price Report'][0];
                const pricePerMWh = parseFloat(smpData.system_marginal_price);
                const pricePerKWh = pricePerMWh / 10; // Convert $/MWh to ¢/kWh
                
                this.lastPrice = pricePerKWh;
                return {
                    price: pricePerKWh,
                    datetime: smpData.begin_datetime_mpt,
                    volume: smpData.volume,
                    raw: smpData
                };
            }
            
            throw new Error('Invalid AESO API response format');
        } catch (error) {
            console.error('Error fetching AESO price:', error);
            throw error;
        }
    }

    /**
     * Send command to Kasa device
     */
    async sendKasaCommand(command) {
        try {
            const payload = {
                method: 'passthrough',
                params: {
                    deviceId: this.deviceIP,
                    requestData: JSON.stringify({
                        system: {
                            set_relay_state: {
                                state: command === 'on' ? 1 : 0
                            }
                        }
                    })
                }
            };

            const response = await axios.post(`http://${this.deviceIP}:${this.devicePort}`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            this.isDeviceOn = command === 'on';
            return response.data;
        } catch (error) {
            console.error(`Error sending Kasa command (${command}):`, error);
            throw error;
        }
    }

    /**
     * Turn on the Kasa switch using Python-Kasa bridge
     */
    async turnOn() {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                const python = spawn('python', ['kasa-python-bridge.py', this.deviceIP, 'on']);
                
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(output);
                            if (result.success) {
                                this.isDeviceOn = true;
                                console.log('✅ Kasa switch turned ON');
                                resolve({ success: true, message: result.message });
                            } else {
                                reject(new Error(result.error));
                            }
                        } catch (parseError) {
                            reject(new Error(`Failed to parse Python output: ${output}`));
                        }
                    } else {
                        reject(new Error(`Python process failed with code ${code}: ${error}`));
                    }
                });
            });
        } catch (error) {
            console.error('Failed to turn on switch:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Turn off the Kasa switch using Python-Kasa bridge
     */
    async turnOff() {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                const python = spawn('python', ['kasa-python-bridge.py', this.deviceIP, 'off']);
                
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(output);
                            if (result.success) {
                                this.isDeviceOn = false;
                                console.log('✅ Kasa switch turned OFF');
                                resolve({ success: true, message: result.message });
                            } else {
                                reject(new Error(result.error));
                            }
                        } catch (parseError) {
                            reject(new Error(`Failed to parse Python output: ${output}`));
                        }
                    } else {
                        reject(new Error(`Python process failed with code ${code}: ${error}`));
                    }
                });
            });
        } catch (error) {
            console.error('Failed to turn off switch:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get current device status using Python-Kasa bridge
     */
    async getDeviceStatus() {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                const python = spawn('python', ['kasa-python-bridge.py', this.deviceIP, 'status']);
                
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(output);
                            if (result.success) {
                                this.isDeviceOn = result.isOn;
                                resolve({
                                    isOn: result.isOn,
                                    deviceName: result.deviceName,
                                    lastUpdate: new Date().toISOString()
                                });
                            } else {
                                reject(new Error(result.error));
                            }
                        } catch (parseError) {
                            reject(new Error(`Failed to parse Python output: ${output}`));
                        }
                    } else {
                        reject(new Error(`Python process failed with code ${code}: ${error}`));
                    }
                });
            });
        } catch (error) {
            console.error('Error getting device status:', error);
            return { isOn: false, error: error.message };
        }
    }

    /**
     * Run automation based on current price
     */
    async runAutomation() {
        if (!this.automationEnabled) {
            return { message: 'Automation disabled' };
        }

        try {
            const priceData = await this.getCurrentPrice();
            const currentPrice = priceData.price;
            
            console.log(`Current price: ${currentPrice.toFixed(2)}¢/kWh`);
            
            let action = null;
            let reason = '';

            if (currentPrice < this.priceThreshold) {
                // Price is below threshold - turn ON
                if (!this.isDeviceOn) {
                    action = 'on';
                    reason = `Price is low (${currentPrice.toFixed(2)}¢/kWh < ${this.priceThreshold}¢/kWh)`;
                }
            } else if (currentPrice >= this.priceThreshold) {
                // Price is at or above threshold - turn OFF
                if (this.isDeviceOn) {
                    action = 'off';
                    reason = `Price is high (${currentPrice.toFixed(2)}¢/kWh >= ${this.priceThreshold}¢/kWh)`;
                }
            }

            if (action) {
                const result = action === 'on' ? await this.turnOn() : await this.turnOff();
                return {
                    action,
                    reason,
                    price: currentPrice,
                    result
                };
            }

            return {
                action: 'none',
                reason: `Price ${currentPrice.toFixed(2)}¢/kWh is within acceptable range`,
                price: currentPrice
            };

        } catch (error) {
            console.error('Automation error:', error);
            return { error: error.message };
        }
    }

    /**
     * Set price threshold for automation
     */
    setPriceThreshold(threshold) {
        this.priceThreshold = threshold;
        console.log(`Price threshold updated: ${threshold}¢/kWh`);
    }

    /**
     * Enable/disable automation
     */
    setAutomation(enabled) {
        this.automationEnabled = enabled;
        console.log(`Automation ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {
            deviceIP: this.deviceIP,
            priceThreshold: this.priceThreshold,
            automationEnabled: this.automationEnabled,
            lastPrice: this.lastPrice,
            isDeviceOn: this.isDeviceOn
        };
    }
}

module.exports = KasaController;
