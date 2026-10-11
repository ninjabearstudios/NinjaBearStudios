# Owner content still needed

The site works with these values empty. Nothing below blocks local review or static deployment. Publish only material approved for public use.

| Destination | Exact location |
| --- | --- |
| TikTok profile | `assets/config.js` → `socials.tiktok` |
| Discord invite/community | `assets/config.js` → `socials.discord` |
| Actual trailer | `assets/config.js` → `media.trailerUrl` |
| Featured highlight/VOD | `assets/config.js` → `media.highlightUrl` |

Use full HTTPS destinations; `contactUrl` also supports `mailto:`. Never add credentials or private contact details. No handles, invitations, or media IDs have been guessed.

Additional editorial content belongs in static HTML:

- `music.html`: Say It Twice track order is undecided. The Fae opera title is undecided; its five tracks use the owner’s confirmed order. All 62 supplied lyrics (including eight numbered Birth of Tragedy tracks and five Fae opera songs), four album covers, and the verified YouTube links for You Stayed the Same, Where the Night has Led, Changeling, and Mind Thy Tongue are included in the album lists. Do not automatically publish other local lyrics or audio files.
- `dev.html#adventurers-journal`, `#ink-memory`, `#universal-empire`: verified public demos/source URLs and confirmed technology/platform details. All three remain in development. Unity is confirmed only for Ink & Memory.
- `streams.html#schedule`: confirmed broadcast dates/times and time zone are still needed. Silent Hill f is the current game; Parts 1–5 are linked in the VOD archive. The complete five-stream Pragmata series is also linked, ending with the finale. The owner’s planned Resident Evil order and viewer recommendations appear under Up Next.
- `anime.html#reactions`, `#reviews`, `#watchlist`: actual entries, public video links, and episode-specific spoiler labels where appropriate.
- `lore.html#archive`: approved story entries. The existing NinjaBear/Glint introduction is preserved without added canon.

The supplied Legacy TileWorks & Design portfolio URL is already in `dev.html#legacy-tileworks` and returned HTTP 200 during verification. The owner-supplied Construction Services Company website is linked in `dev.html#construction-services` and also returned HTTP 200 when added. No public app or game project URLs were supplied. The verified YouTube channel is configured as a text link. Something Good Today now appears as an approved Say It Twice lyric, without an unprovided listening link.

Website inquiries use `inquiry.html` and the owner-confirmed email in `assets/config.js`. The form opens an email draft for the visitor to send; it does not submit to a server.
