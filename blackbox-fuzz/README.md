# Blackbox

**Black-box fuzzer for Quai smart contracts.**

Point it at any deployed Quai contract and it throws randomized transactions at it — no source code required. Blackbox surfaces unexpected reverts, gas anomalies, and invariant violations that a human reviewer might miss.

## Why Blackbox?

Most fuzzers (Echidna, ItyFuzz) assume you have source or bytecode. Quai builders often don't — they have an address and an ABI. Blackbox is built for that case.

| | Echidna / ItyFuzz | Blackbox |
|---|---|---|
| Target chain | Ethereum + EVM L2s | Quai Network |
| Source requirement | Source or bytecode | **ABI only** |
| Test environment | Local fork | Orchard testnet |

## Install

```bash
npm install -g blackbox-fuzz