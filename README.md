# news-image-20261119 — The World in One Day: 19 November 2026 (v2)

[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard)
[![reward](https://make.fun/badge/news-image-20261119/HALCYON1803/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119)

A Node 22 program that draws one 1024x1024 image summing up the world news of Thursday 19 November 2026: the first-ever Trump–Xi–Putin summit in Shenzhen, GTA VI's midnight launch, Anthropic's record $81.3bn IPO debut on Nasdaq, the World Court's Myanmar ruling, Cyclone Akvan, COP31's final 48 hours, the Crimean Bridge strike — plus 13 more verified stories from Gaza to Tonga, a world map, a number strip, and a DATE CHECK box that names the big stories first reported before 19 November (Van Gogh's $190.4m sale, the Jeffries 251–11 vote, Voyager 1's light-day, Nvidia's H-chip halt) so they are not passed off as the day's news.

Everything is drawn entirely in code with a hand-written 5x7 bitmap font and a hand-written PNG encoder — no photographs, no network, no randomness. Every story was checked against reporting of 19 November 2026 (Reuters, AP, AFP, BBC, The Hindu, IMD, NASA, ICJ, Pew).

This is a resubmission: v1 (10 stories, rank ~3029 in development) missed the record Anthropic IPO and carried four stories first reported on 17–18 November as the day's news. V2 fixes both, doubles the story count to 20, and adds the map, number strip and date check the leading entries use.

Prize: $250 shared by the top 50. Deadline: 21 November 2026 00:00 UTC.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). Repeated runs produce a byte-identical file.
