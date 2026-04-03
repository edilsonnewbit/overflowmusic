const intervalMs = 60000;

console.log("[worker] started");

setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, intervalMs);
