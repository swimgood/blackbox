import { randomBytes } from 'crypto';

let seedState: number | undefined;

export function setSeed(seed?: number) {
  seedState = seed;
}

export function nextRandom(): number {
  if (seedState === undefined) return Math.random();
  seedState = (seedState * 1664525 + 1013904223) % 0x100000000;
  return seedState / 0x100000000;
}

export function randomUint256(): bigint {
  const bytes = randomBytes(32);
  let result = 0n;
  for (const b of bytes) result = (result << 8n) + BigInt(b);
  return result;
}

export function randomAddress(): string {
  return '0x' + randomBytes(20).toString('hex');
}

export function randomBool(): boolean {
  return nextRandom() > 0.5;
}

export function randomBytesData(): string {
  const len = Math.floor(nextRandom() * 64);
  return '0x' + randomBytes(len).toString('hex');
}

export function generateValue(type: string): any {
  if (nextRandom() < 0.2) {
    if (type.startsWith('uint') || type.startsWith('int')) {
      const boundaries = ['0', '1', '115792089237316195423570985008687907853269984665640564039457584007913129639935'];
      return BigInt(boundaries[Math.floor(nextRandom() * boundaries.length)]);
    }
    if (type === 'address') return '0x0000000000000000000000000000000000000000';
    if (type === 'bool') return nextRandom() > 0.5;
    if (type === 'bytes' || type.startsWith('bytes')) return '0x';
  }

  if (type.startsWith('uint') || type.startsWith('int')) return randomUint256();
  if (type === 'address') return randomAddress();
  if (type === 'bool') return randomBool();
  if (type === 'bytes' || type.startsWith('bytes')) return randomBytesData();
  if (type === 'string') return 'fuzz_' + randomBytes(8).toString('hex');

  return 0;
}

export function generateCall(abi: any[]): { name: string; args: any[] } | null {
  const functions = abi.filter(
    (e) => e.type === 'function' && e.stateMutability !== 'view' && e.stateMutability !== 'pure'
  );

  if (functions.length === 0) return null;

  const fn = functions[Math.floor(nextRandom() * functions.length)];
  const args = (fn.inputs || []).map((inp: any) => generateValue(inp.type));

  return { name: fn.name, args };
}