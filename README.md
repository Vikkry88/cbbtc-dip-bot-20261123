[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Vikkry88/cbbtc-dip-bot-20261123/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Vikkry88/cbbtc-dip-bot-20261123/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

# cbBTC dip bot — btc-race-24h-20261123-0511

Entry for the make.fun bounty
[btc-race-24h-20261123-0511](https://make.fun/bounty/btc-race-24h-20261123-0511):
a paper-trading bot that trades Coinbase Wrapped BTC (cbBTC) minute by
minute in the bars-replay/v1 harness. Nothing is traded for real.

Strategy: track the 21-bar EMA of closes; when flat and the close dips
at least 0.4% below EMA21, buy with all cash; sell everything at +1.2%
over the entry close or -1.0% under it; wait 5 bars after an exit
before buying again. Long only, one position, deterministic.

On this race's frozen dev window the bot made +$23.39 over 2 round
trips with ~1.6% max drawdown (local grade).
