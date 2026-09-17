import { quais } from 'quais';
import { generateCall, setSeed } from './generators.js';
import { takeSnapshot, diffSnapshots, Anomaly } from './invariant.js';
import { GasTracker, GasAnomaly } from './gas.js';

export interface FuzzOptions {
  address: string;
  abi: any[];
  abiOverridden: boolean;
  zone: string;
  rpc: string;
  runs: number;
  seed?: number;
  output: string;
}

export async function runFuzzer(options: FuzzOptions) {
  setSeed(options.seed);

  const provider = new quais.JsonRpcProvider(options.rpc);
  const contract = new quais.Contract(options.address, options.abi, provider);
  const gasTracker = new GasTracker(2.0);

  const anomalies: Anomaly[] = [];
  const gasAnomalies: GasAnomaly[] = [];
  const callSequence: string[] = [];
  const storageSlots = ['0x0', '0x1', '0x2'];

  for (let i = 0; i < options.runs; i++) {
    const call = generateCall(options.abi);
    if (!call) {
      console.log('[Blackbox] No non-view functions in ABI.');
      return;
    }

    const callDesc = `${call.name}(${call.args.join(', ')})`;
    callSequence.push(callDesc);

    const before = await takeSnapshot(provider, options.address, storageSlots);

    try {
      await contract[call.name].staticCall(...call.args);
    } catch (err: any) {
      if (err.message?.includes('revert')) {
        console.log(`[Blackbox] Run ${i + 1}/${options.runs}: ${callDesc} → REVERT`);
      } else {
        console.log(`[Blackbox] Run ${i + 1}/${options.runs}: ${callDesc} → ERROR: ${err.message}`);
      }
      callSequence.pop();
      continue;
    }

    let tx;
    try {
      tx = await contract[call.name](...call.args);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed ?? 0n;
      console.log(`[Blackbox] Run ${i + 1}/${options.runs}: ${callDesc} → OK (gas: ${gasUsed})`);

      const gasAnomaly = gasTracker.record(call.name, gasUsed, i + 1);
      if (gasAnomaly) {
        gasAnomalies.push(gasAnomaly);
        console.log(`[Blackbox] !!! GAS ANOMALY at run ${i + 1}: ${call.name}`);
      }
    } catch (err: any) {
      console.log(`[Blackbox] Run ${i + 1}/${options.runs}: ${callDesc} → TX FAILED: ${err.message}`);
      callSequence.pop();
      continue;
    }

    const after = await takeSnapshot(provider, options.address, storageSlots);
    const found = diffSnapshots(before, after, [...callSequence]);

    if (found.length > 0) {
      anomalies.push(...found);
      console.log(`[Blackbox] !!! ANOMALY at run ${i + 1}`);
      for (const a of found) console.log(`[Blackbox]   ${a.type}: ${a.detail}`);
    }
  }

  const fs = await import('fs/promises');
  await fs.mkdir(options.output, { recursive: true });
  const reportPath = `${options.output}/run-${Date.now()}.json`;
  await fs.writeFile(
    reportPath,
    JSON.stringify({ runs: options.runs, anomalies, gasAnomalies, gasSummary: gasTracker.summary() }, null, 2)
  );
  console.log(`[Blackbox] Report → ${reportPath}`);
}