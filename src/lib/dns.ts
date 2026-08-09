import dns from "dns";

/**
 * Forces Node.js to use Google and Cloudflare public DNS servers for name resolution.
 * Solves querySrv ECONNREFUSED issues on local networks / ISPs when connecting to MongoDB Atlas (mongodb+srv://).
 */
export function configureCustomDns() {
  try {
    dns.setServers([
      "8.8.8.8", // Google Primary DNS
      "1.1.1.1", // Cloudflare Primary DNS
      "8.8.4.4", // Google Secondary DNS
      "1.0.0.1", // Cloudflare Secondary DNS
    ]);
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  } catch (error) {
    console.warn("Failed to configure custom DNS servers:", error);
  }
}

// Automatically configure DNS when this module is imported
configureCustomDns();

