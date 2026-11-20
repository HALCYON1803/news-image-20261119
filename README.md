# news-image-20261119 — The World in One Day: 19 November 2026 (v3)

[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard)
[![reward](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119)

A Node 22 program that draws one 1024x1024 image summing up the world news of Thursday 19 November 2026: the first-ever Trump–Xi–Putin summit in Shenzhen, GTA VI's midnight launch, Anthropic's record $81.3bn IPO debut on Nasdaq, the World Court's Myanmar ruling, Cyclone Akvan, COP31's final 48 hours, the Crimean Bridge strike — plus 32 more verified stories from Gaza to Tonga, a world map, a number strip, and a DATE CHECK box that names the big stories first reported before 19 November (Van Gogh's $190.4m sale, the Jeffries 251–11 vote, Voyager 1's light-day, Nvidia's H-chip halt) so they are not passed off as the day's news.

Everything is drawn entirely in code with a hand-written 5x7 bitmap font and a hand-written PNG encoder — no photographs, no network, no randomness. Every story was checked against reporting of 19 November 2026 (Reuters, AP, AFP, BBC, The Hindu, IMD, NASA, ICJ, Pew).

This is a resubmission: v1 (10 stories, rank ~3029 in development) missed the record Anthropic IPO and carried four stories first reported on 17–18 November as the day's news. V2 fixed both, doubled the story count to 20, and added the map, number strip and date check the leading entries use. V3 is the full-day edition: 39 stories (7 heroes + 32 briefs), and it corrects the three stories that moved after v2 was filed — the COP31 draft dropped its fossil-fuel phase-out and $120bn target, Anthropic closed its first day up 17% at $97.17, and the ICJ found Myanmar committed genocide. The $120bn number-strip cell is replaced by the 900,000 AI chips the US cleared for China.

Prize: $250 shared by the top 50. Deadline: 21 November 2026 00:00 UTC.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). Repeated runs produce a byte-identical file.
