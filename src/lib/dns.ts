import "./polyfills/pdfjs-polyfill";
import dns from "dns";
import { Resolver } from "dns/promises";

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

/**
 * Resolves mongodb+srv:// URIs to direct seed lists using Google/Cloudflare DNS.
 * Completely eliminates querySrv ECONNREFUSED issues by converting SRV lookups before Mongoose connects.
 */
export async function resolveMongoUri(uri: string): Promise<string> {
  if (!uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  try {
    const match = uri.match(
      /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)(\/.*)?$/
    );

    if (!match) {
      return uri;
    }

    const [, user, pass, host, rest] = match;

    const resolver = new Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);

    const srvs = await resolver.resolveSrv("_mongodb._tcp." + host);

    if (!srvs || srvs.length === 0) {
      return uri;
    }

    const hostList = srvs.map((s) => `${s.name}:${s.port}`).join(",");
    const cleanRest = rest || "/";
    const separator = cleanRest.includes("?") ? "&" : "?";

    return `mongodb://${user}:${pass}@${hostList}${cleanRest}${separator}tls=true&authSource=admin`;
  } catch (error) {
    console.warn("SRV resolution fallback to original URI:", error);
    return uri;
  }
}
