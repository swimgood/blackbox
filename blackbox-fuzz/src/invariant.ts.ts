import { quais } from 'quais';

export interface Snapshot {
  blockNumber: number;
  balance: bigint;
  storage: Map<string, string>;
}

export interface Anomaly {
  type: 'gas-spike' | 'balance-change' | 'storage-change' | 'unexpected-revert';
  detail: string;
  callSequence: string[];
}

export async function takeSnapshot(
  provider: quais.Provider,
  address: string,
  storageSlots: string[]
): Promise<Snapshot> {
  const balance = await provider.getBalance(address);
  const blockNumber = await provider.getBlockNumber();
  const storage = new Map<string, string>();

  for (const slot of storageSlots) {
    try {
      const value = await provider.getStorage(address, slot);
      storage.set(slot, value);
    } catch {}
  }

  return { blockNumber, balance, storage };
}

export function diffSnapshots(
  before: Snapshot,
  after: Snapshot,
  callSequence: string[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (before.balance !== after.balance) {
    anomalies.push({
      type: 'balance-change',
      detail: `Balance: ${before.balance} → ${after.balance}`,
      callSequence,
    });
  }

  for (const [slot, beforeVal] of before.storage) {
    const afterVal = after.storage.get(slot);
    if (afterVal !== undefined && afterVal !== beforeVal) {
      anomalies.push({
        type: 'storage-change',
        detail: `Slot ${slot}: ${beforeVal} → ${afterVal}`,
        callSequence,
      });
    }
  }

  return anomalies;
}