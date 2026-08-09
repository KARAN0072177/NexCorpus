# Architecture Decision Record (ADR): DNS Override & MongoDB Connection Handling

## 1. Context & Problem Statement

When connecting to MongoDB Atlas using the standard SRV connection string format (`mongodb+srv://...`), Node.js uses the operating system's default DNS resolver to perform an SRV record query (`querySrv`). 

In many local network and ISP environments, local DNS servers block, misroute, or fail to resolve `_mongodb._tcp` SRV queries. This resulted in the following runtime failure:

```text
MongoDB health check failed: Error: querySrv ECONNREFUSED _mongodb._tcp.aoie.epect.mongodb.net
  code: 'ECONNREFUSED',
  syscall: 'querySrv',
  hostname: '_mongodb._tcp.aoie.epect.mongodb.net'
```

Additionally, standard Mongoose connection caching in Next.js development environments (where Hot Module Replacement occurs) can trap rejected connection promises inside `globalThis`. If a connection attempt fails once, subsequent calls keep returning the cached rejected promise instead of retrying.

---

## 2. Decisions & Technical Implementation

### A. Public DNS Resolution Helper (`src/lib/dns.ts`)
We implemented a dedicated DNS helper function `configureCustomDns()` using Node.js's built-in `dns` module (`dns.setServers`). 

* **Configured DNS Servers**:
  * `8.8.8.8` (Google Primary)
  * `1.1.1.1` (Cloudflare Primary)
  * `8.8.4.4` (Google Secondary)
  * `1.0.0.1` (Cloudflare Secondary)

```typescript
import dns from "dns";

export function configureCustomDns() {
  try {
    dns.setServers([
      "8.8.8.8",
      "1.1.1.1",
      "8.8.4.4",
      "1.0.0.1",
    ]);
  } catch (error) {
    console.warn("Failed to configure custom DNS servers:", error);
  }
}
```

### B. Resilient Database Connection Client (`src/lib/db/mongodb.ts`)
We integrated the DNS helper into the central MongoDB connection client and refined the Promise caching strategy to invalidate failed promises.

Key features:
1. **Pre-connection DNS configuration**: `configureCustomDns()` is executed prior to `mongoose.connect()`.
2. **Global state caching**: Reuses existing connections across Next.js API route invocations during development.
3. **Promise Invalidation on Failure**: Automatically resets `cached.promise = null` in `.catch()` blocks if a connection attempt fails, preventing sticky 500 errors on transient failures.

### C. Health Check Route (`src/app/api/health/mongodb/route.ts`)
Created a dedicated health check endpoint at `/api/health/mongodb` that verifies `mongoose.connection.readyState === 1` and returns standard JSON status responses (`200 OK` or `503 / 500`).

---

## 3. Consequences & Benefits

* **Reliable Local Development**: Developers on networks with problematic local DNS resolvers can connect to MongoDB Atlas seamlessly without requiring system-wide network configuration changes.
* **Transient Failure Resilience**: Connection failures do not permanently poison the cached Mongoose state in `globalThis`.
* **Zero Production Overhead**: Using public DNS resolvers for MongoDB SRV lookups imposes no extra latency and ensures consistent cross-environment lookup performance.
