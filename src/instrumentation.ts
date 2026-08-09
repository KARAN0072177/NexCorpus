export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { configureCustomDns } = await import("@/lib/dns");
    configureCustomDns();
  }
}
