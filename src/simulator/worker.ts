import { applyRates, createSimulation, type SimConfig } from './model';
self.onmessage = (event: MessageEvent<SimConfig>) => {
  try {
    const config = event.data;
    const sim = createSimulation(config, __APP_VERSION__);
    applyRates(config.rates);
    const start = performance.now(), total = config.hours * 3_600_000;
    let last = start;
    while (sim.report.simulatedMs < total) {
      sim.step();
      if (performance.now() - last > 400) { self.postMessage({ type: 'progress', ms: sim.report.simulatedMs, total }); last = performance.now(); }
    }
    sim.report.elapsedMs = performance.now() - start;
    self.postMessage({ type: 'done', report: sim.report });
  } catch (error) { self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) }); }
};
