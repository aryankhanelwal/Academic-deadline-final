/**
 * NETWORK UTILITIES
 * 
 * This module provides utility functions for dynamic network configuration.
 * It helps detect local network interfaces and provides URLs for easy access.
 */

const os = require('os');

/**
 * Get all network interfaces with IP addresses
 * @returns {Array} Array of network interface objects
 */
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const networkList = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface) => {
      // Skip internal/loopback and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        networkList.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac
        });
      }
    });
  });

  return networkList;
}

/**
 * Get the primary local network IP address
 * @returns {string} Primary IP address or fallback
 */
function getLocalIP() {
  const interfaces = getNetworkInterfaces();
  
  // Prefer ethernet/WiFi interfaces
  const preferredInterface = interfaces.find(iface => 
    iface.name.toLowerCase().includes('ethernet') || 
    iface.name.toLowerCase().includes('wi-fi') ||
    iface.name.toLowerCase().includes('wifi') ||
    iface.name.toLowerCase().includes('en0') ||
    iface.name.toLowerCase().includes('wlan')
  );

  if (preferredInterface) {
    return preferredInterface.address;
  }

  // Fall back to first available interface
  return interfaces.length > 0 ? interfaces[0].address : 'localhost';
}

/**
 * Generate access URLs for the server
 * @param {number} port - Server port number
 * @returns {Object} Object containing various access URLs
 */
function generateAccessUrls(port) {
  const localIP = getLocalIP();
  const interfaces = getNetworkInterfaces();
  
  return {
    local: `http://localhost:${port}`,
    network: `http://${localIP}:${port}`,
    allInterfaces: interfaces.map(iface => ({
      name: iface.name,
      url: `http://${iface.address}:${port}`
    }))
  };
}

/**
 * Display startup information with all available URLs
 * @param {number} port - Server port number
 */
function displayStartupInfo(port) {
  const urls = generateAccessUrls(port);
  const interfaces = getNetworkInterfaces();
  
  console.log('\n🚀 Server is running!');
  console.log('==========================================');
  console.log(`📍 Local:    ${urls.local}`);
  console.log(`🌐 Network:  ${urls.network}`);
  
  if (interfaces.length > 1) {
    console.log('\n📡 All Network Interfaces:');
    interfaces.forEach(iface => {
      console.log(`   ${iface.name}: http://${iface.address}:${port}`);
    });
  }
  
  console.log('\n💡 Access your app using any of the above URLs');
  console.log('   - Use "Local" URL when testing on the same machine');
  console.log('   - Use "Network" URL when accessing from other devices on the same network');
  console.log('==========================================\n');
}

module.exports = {
  getNetworkInterfaces,
  getLocalIP,
  generateAccessUrls,
  displayStartupInfo
};
