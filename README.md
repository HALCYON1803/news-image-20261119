# news-image-20261119 — The World Today: 19 November 2026

[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard)
[![reward](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119)

A Node 22 program that draws one 1024x1024 image summing up the world news of Thursday 19 November 2026: the trilateral Shenzhen summit, the Gulf war widening, the ICJ Myanmar verdict, the Crimean Bridge attack, Cyclone Akvan, and the GTA VI launch. Everything is drawn entirely in code with a hand-written 5x7 bitmap font and a hand-written PNG encoder — no photographs, no network, no randomness.

Prize: $250 shared by the top 50. Deadline: 21 November 2026 00:00 UTC.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). Repeated runs produce a byte-identical file.
