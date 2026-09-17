import { readFile } from 'fs/promises';

const EXPLORERS: Record<string, string> = {
  orchard: 'https://orchard.quaiscan.io',
  cyprus1: 'https://orchard.quaiscan.io',
  mainnet: 'https://quaiscan.io',
};

export async function loadAbi(
  address: string,
  zone: string,
  abiPath?: string
): Promise<any[]> {
  if (abiPath) {
    const raw = await readFile(abiPath, 'utf-8');
    return JSON.parse(raw);
  }

  const base = EXPLORERS[zone] ?? EXPLORERS.orchard;
  const url = `${base}/api?module=contract&action=getabi&address=${address}`;

  console.log(`[Blackbox] Fetching ABI from Quaiscan: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quaiscan API returned HTTP ${res.status}`);

  const data: any = await res.json();

  if (data.status !== '1') {
    throw new Error(
      `ABI not available for ${address} on ${zone}. ` +
      `Contract may be unverified. Pass --abi ./path/to/abi.json\n` +
      `Quaiscan message: ${data.message}`
    );
  }

  const abi = JSON.parse(data.result);
  if (!Array.isArray(abi)) throw new Error('Quaiscan returned malformed ABI');
  return abi;
}