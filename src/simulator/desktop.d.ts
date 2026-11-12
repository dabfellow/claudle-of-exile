interface SimulatorLiveSource {
  gameVersion: string;
  releaseId: string;
  checkedAt: string;
  origin: string;
  eventRows: import('../data/events').EventRow[];
}
interface Window {
  balanceLab?: { getSource(): Promise<SimulatorLiveSource>; verifyLive(): Promise<SimulatorLiveSource> };
}
