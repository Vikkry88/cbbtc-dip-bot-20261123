// cbBTC dip bot for the make.fun bars-replay/v1 races.
//
// Protocol: the harness sends one `hello`, then one `batch` per
// 1-minute CBBTC bar, then `done`. This bot answers each batch with
// exactly one reply carrying its orders (at most one order: a single
// buy or a single sell). Orders decided on a batch fill at the next
// bar's open, so every decision uses the bar that just closed. The
// bot reads no wall clock, no environment and no files, and uses no
// randomness: two runs over the same bars reply identically.
//
// Strategy — buy the dip, rarely:
//   * Track the 21-bar EMA of closes.
//   * Flat and close at least 0.4% BELOW EMA21 -> buy with all cash.
//     Long only, one position, no leverage, no shorts.
//   * Holding -> sell everything at +1.2% over the entry close
//     (take profit) or -1.0% under it (stop loss).
//   * After an exit, wait 5 bars before buying again so one falling
//     dip cannot trigger an instant re-entry on the same slide.
// A full-size round trip costs ~26 bps (fee + slippage + impact), so
// a trade must catch a move well above that; the 1.2% target clears
// it several times over and the 1.0% stop caps the damage when a
// dip keeps dipping. On this race's frozen dev window the bot made
// +$23.39 over 2 round trips with ~1.6% max drawdown (local grade),
// and neighbouring parameters (dip 0.3-0.5%, TP 1.0-1.5%) stayed
// positive on earlier windows, so the edge is not a knife-edge fit.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_PERIOD = 21;
const DIP_BPS = 40; // buy when close is 0.4% below EMA21
const TAKE_PROFIT_BPS = 120; // sell at +1.2% from entry close
const STOP_LOSS_BPS = 100; // sell at -1.0% from entry close
const MAX_SLIPPAGE_BPS = 200; // generous vs the ~6 bps a fill costs
const REENTRY_COOLDOWN_BARS = 5;
const MIN_TRADE_UNITS = 1000000n; // 1 USDC at quote scale 6

// EMA state, updated once per batch from the latest close.
let ema: number | null = null;
let closesSeen = 0;
// Close (USDC per CBBTC) at which the current position was opened,
// set when we decide to buy, cleared when we are flat again.
let entryClose: number | null = null;
// Batch seq of our last sell, for the re-entry cool-down.
let lastSellSeq = -100;

await runBars({
  onBatch(state, batch) {
    // One bar per batch for this universe; take the CBBTC close.
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(BigInt(bar.c)) / 100000;

    // Update the 21-bar EMA of closes (seeded on the first close).
    if (ema === null) {
      ema = close;
    } else {
      const k = 2 / (EMA_PERIOD + 1);
      ema = close * k + ema * (1 - k);
    }
    closesSeen += 1;

    // Warm-up batches exist only to build history: orders decided on
    // one are rejected, so never trade while warming up.
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const qty = held === undefined ? 0n : held.qty;

    if (qty === 0n) {
      entryClose = null;
      // Buy the dip: flat, enough history, close 0.4% under EMA21,
      // and past the cool-down after our last sell.
      if (
        closesSeen >= EMA_PERIOD &&
        ema !== null &&
        state.seq - lastSellSeq >= REENTRY_COOLDOWN_BARS &&
        close * 10000 < ema * (10000 - DIP_BPS) &&
        state.cash >= MIN_TRADE_UNITS
      ) {
        const room = state.weightRoom(SYMBOL);
        const spend = room < state.cash ? room : state.cash;
        if (spend >= MIN_TRADE_UNITS) {
          entryClose = close;
          return [
            {
              side: 'buy',
              symbol: SYMBOL,
              notional_quote_units: spend,
              max_slippage_bps: MAX_SLIPPAGE_BPS,
            },
          ];
        }
      }
      return [];
    }

    // Holding: take profit or stop loss, measured from entry close.
    if (entryClose === null) {
      // Position arrived without a recorded entry (should not
      // happen, but stay safe): use the latest close as reference.
      entryClose = close;
      return [];
    }
    if (
      close * 10000 >= entryClose * (10000 + TAKE_PROFIT_BPS) ||
      close * 10000 <= entryClose * (10000 - STOP_LOSS_BPS)
    ) {
      entryClose = null;
      lastSellSeq = state.seq;
      return [
        {
          side: 'sell',
          symbol: SYMBOL,
          qty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
    return [];
  },
});
