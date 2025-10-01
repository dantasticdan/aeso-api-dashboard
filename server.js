/**
 * Express server for AESO-Kasa integration
 * Provides REST API for controlling Kasa switches based on AESO data
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const KasaController = require('./kasa-controller');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Kasa controller
const kasaController = new KasaController();

// Routes

/**
 * GET /api/status
 * Get current device and automation status
 */
app.get('/api/status', async (req, res) => {
    try {
        const deviceStatus = await kasaController.getDeviceStatus();
        const config = kasaController.getConfig();
        
        res.json({
            success: true,
            device: deviceStatus,
            config: config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/price
 * Get current AESO price
 */
app.get('/api/price', async (req, res) => {
    try {
        const priceData = await kasaController.getCurrentPrice();
        res.json({
            success: true,
            data: priceData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/pool-price
 * Get historical pool price data
 */
app.get('/api/pool-price', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate parameter is required'
            });
        }

        // Build AESO API URL
        let url = `https://apimgw.aeso.ca/public/poolprice-api/v1.1/price/poolPrice?startDate=${startDate}`;
        if (endDate) {
            url += `&endDate=${endDate}`;
        }

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'API-KEY': process.env.AESO_API_KEY || 'fddc2df776174e96bdb06e06cdaa3052'
            }
        });

        const data = response.data;
        
        // Handle AESO API response structure
        let poolPriceData = [];
        if (data && data.return && data.return['Pool Price Report'] && Array.isArray(data.return['Pool Price Report'])) {
            poolPriceData = data.return['Pool Price Report'];
        } else if (data && data['Pool Price Report'] && Array.isArray(data['Pool Price Report'])) {
            poolPriceData = data['Pool Price Report'];
        } else if (Array.isArray(data)) {
            poolPriceData = data;
        } else {
            throw new Error('Invalid pool price data format received from AESO API');
        }

        res.json({
            success: true,
            data: poolPriceData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/switch/on
 * Turn on the Kasa switch
 */
app.post('/api/switch/on', async (req, res) => {
    try {
        const result = await kasaController.turnOn();
        res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/switch/off
 * Turn off the Kasa switch
 */
app.post('/api/switch/off', async (req, res) => {
    try {
        const result = await kasaController.turnOff();
        res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/automation/run
 * Run automation based on current price
 */
app.post('/api/automation/run', async (req, res) => {
    try {
        const result = await kasaController.runAutomation();
        res.json({
            success: true,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/automation/config
 * Configure automation settings
 */
app.post('/api/automation/config', (req, res) => {
    try {
        const { enabled, threshold } = req.body;
        
        if (typeof enabled === 'boolean') {
            kasaController.setAutomation(enabled);
        }
        
        if (typeof threshold === 'number') {
            kasaController.setPriceThreshold(threshold);
        }
        
        res.json({
            success: true,
            config: kasaController.getConfig(),
            message: 'Configuration updated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/automation/config
 * Get current automation configuration
 */
app.get('/api/automation/config', (req, res) => {
    try {
        const config = kasaController.getConfig();
        res.json({
            success: true,
            config: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(port, () => {
    console.log(`AESO-Kasa integration server running on port ${port}`);
    console.log(`Device IP: ${kasaController.deviceIP}`);
    console.log(`Automation enabled: ${kasaController.automationEnabled}`);
});

// Auto-run automation every 15 minutes
setInterval(async () => {
    try {
        if (kasaController.automationEnabled) {
            console.log('Running scheduled automation...');
            const result = await kasaController.runAutomation();
            console.log('Automation result:', result);
        }
    } catch (error) {
        console.error('Scheduled automation error:', error);
    }
}, 15 * 60 * 1000); // 15 minutes

module.exports = app;
