# Faction Tracker

A lightweight web app for TTRPG players to check faction standings and read short notes provided by the DM. Filled tracks show each faction's awareness of the party and opinion of the party. Selecting a faction shows its notes beside the list on desktop and in a popup on mobile.

The project adapts the static HTML, CSS, JavaScript, palettes, and local hosting from Stars, Stones & Salt Tarot and Obsidian GitHub Web Hosting. It runs on GitHub Pages or another static hosting service, without a required backend or build step. 

## Run locally

1. Install Node.js if it is not already available.
2. Double-click `tools/Open Site.cmd`.
3. Open `http://127.0.0.1:8782/`. Keep the launcher running while using the app.

Alternatively, run `node tools/local-server.cjs --no-open` from this folder and open the URL yourself. Port 8782 must be available. Opening `index.html` directly does not work because browsers restrict fetching JSON from file URLs.

## Using the tracker

- Select a faction for its DM notes, contact, and location. Desktop shows a panel on the right; mobile opens a dialog that can be closed with its close button or Escape.
- Search by name or category. Refresh standings reloads the configuration and the selected data source without reloading the page.
- Choose Dusk, Parchment, Sage, or Ocean and toggle light/dark mode in the header. Appearance preferences are saved in this browser when browser storage is available.
- The tracks are read-only player references. Awareness fills from left to right; opinion fills outward from neutral in the center, toward hostile on the left or allied on the right. Values and labels accompany the colors.

## Edit the campaign and factions

Edit `assets/site-config.json` for site text, icons, meters, and data source settings. Set `dataSource` to `sheets` for Google Sheets or `json` for the local file specified by `dataUrl`.

The configuration uses the tarot reader's `title`, `subtitle`, `eyebrow`, and `headerIcon: { "symbol": "✦", "image": "" }` format. The header icon also supplies the browser favicon. Set `image` to a local or hosted image URL; a failed image falls back to the symbol. `factionIcon: { "symbol": "✦", "image": "" }` supplies the default icon for factions without their own symbol, in both the list and dossier. A faction's own symbol takes precedence; otherwise the configured image is used when it loads, falling back to the configured symbol. Tracker-specific `campaign`, `dataSource`, and `dataUrl` options remain available.

The `text` object customizes interface copy: list heading and help, search placeholder, source badge, refresh button, faction count, dossier headings, empty states, palette names, accessibility labels, status messages, and both footer fields. Meter names, labels, ranges, and colors are configured in `metrics` (see below). Missing text keys use the built-in defaults; an empty string intentionally hides that copy. Templates use named placeholders such as `{visible}`, `{total}`, `{label}`, `{value}`, `{meters}`, and `{date}`; keep the placeholders shown in the supplied config. Technical validation errors retain their diagnostic descriptions.

Edit faction-specific names, categories, symbols, notes, contacts, locations, and values in the configured Google Sheet, or in `assets/factions.json` when using JSON mode. Click **Refresh standings** after changing data or site configuration.

Edit `assets/factions.json` to replace the six fictional sample factions. The file contains an `updatedAt` string and a `factions` array:

```json
{
  "updatedAt": "2026-10-08",
  "factions": [
    {
      "id": "harbor-watch",
      "name": "The Harbor Watch",
      "symbol": "⚓",
      "category": "City authority",
      "awareness": 80,
      "opinion": 30,
      "influence": 5,
      "censored": false,
      "blurb": "The captain remembers your help at the docks.",
      "contact": "Captain Mara Vey",
      "location": "The harbor precinct"
    }
  ]
}
```

IDs must be unique, nonempty strings; keep them stable when editing. Names are required. By default, awareness is a number from 0 to 100 and opinion is a number from -100 to 100; the `metrics` configuration sets the actual required numeric fields and limits. The other faction fields are optional plain text. Notes preserve line breaks (use `\n` within a JSON string) and do not interpret HTML. An empty factions array is supported. Invalid data shows an error and leaves any previously loaded standings visible.

Awareness labels: 0 Unaware; above 0 and below 25 Rumors; 25–49 Noticed; 50–74 Familiar; 75–89 Watching; 90–100 Closely watching. Opinion labels: -100 through -75 Hostile; above -75 through -25 Unfriendly; above -25 and below 25 Neutral; 25 through below 75 Friendly; 75–100 Allied.

## Appearance defaults and footer link

`appearance.palette` sets the initial palette (`dusk`, `parchment`, `sage`, or `ocean`) and `appearance.mode` sets `dark` or `light`. Saved visitor preferences take precedence. Reload the page to apply changed defaults; use a fresh browser session or clear saved appearance preferences to see them.

`footerLink.text` identifies the portion of `text.footerLeft` to turn into a link, and `footerLink.url` sets its full HTTP/HTTPS URL. The supplied values link TechInTheKitchen to The-Kitchen.dev. An empty text or URL disables the link. Other footer text remains plain text.

## Font options

Use the `fonts` object in `assets/site-config.json` to choose fonts separately for headings (brand, campaign, faction names), notes (dossier prose and contact/location values), interface (controls, meter labels, and other UI text), and censored (scrambled characters):

```json
"fonts": {
  "headings": "cinzel",
  "notes": "im-fell-english",
  "interface": "system",
  "censored": "noto-sans-khmer"
}
```

| Option | Font |
| --- | --- |
| `system` | Device's system UI font |
| `georgia` | Georgia serif with a device serif fallback |
| `monospace` | Device's monospace font |
| `cinzel` | Cinzel, for classical fantasy headings |
| `uncial-antiqua` | Uncial Antiqua, for medieval manuscript headings |
| `im-fell-english` | IM Fell English, for old-book-style prose |
| `noto-sans-khmer` | Noto Sans Khmer, supporting the supplied Khmer scramble characters |
| `noto-sans-runic` | Noto Sans Runic, for a Runic scramble character pool |

Any option can be assigned to any role, but Khmer/Runic fonts are intended for those character sets. Changing the scramble font does not change its characters: also edit `censorship.characters` if switching scripts. The supplied pool contains Khmer consonants without combining marks. All five downloadable fonts are self-hosted in `assets/fonts/`; include that directory and `assets/fonts.css` when deploying. Their OFL licenses are retained alongside each font. No third-party font requests are made. Missing role settings use the original Georgia/system/monospace styles. Refresh standings applies font configuration changes.

## Censored factions

Set `"censored": true` on a JSON faction, or add a `censored` column to Google Sheets and enter `TRUE` (a checkbox also works). `FALSE`, a blank cell, or a missing column means visible. JSON flags must be booleans, not quoted strings. The sample JSON marks The Mossbound Circle as censored.

Censored factions remain selectable and show their symbol (or configured fallback icon) and all configured meter values, labels, and colors. Their name, category, notes, contact, and location are replaced by random characters in both the list and dossier. Searches use `Unknown faction` and `Not yet discovered` instead of the underlying name/category. Setting the flag to false and refreshing reveals the identifying text.

Customize the scramble character pool and cycling speed through `censorship.characters` and `censorship.intervalMs` in the site config. The interval accepts 200–10000 milliseconds (default 240); characters must contain at least two distinct characters without whitespace. `censorship.changeFraction` controls the randomly selected share of letters changed per tick (default approximately one third; accepts values greater than 0 through 1). Each text field selects its own random positions, leaving the remaining letters and spacing unchanged. The number changed rounds up to at least one character. `text.unknownFaction` and `text.censoredText` customize the stable text alternatives. Screen readers receive these alternatives instead of changing random text, and reduced-motion mode shows a static scramble.

**Censorship is a visual effect, not private storage.** The public Sheet/JSON remains downloadable, including the underlying text. For an undiscovered faction, use a neutral ID and placeholder text in the public data until its identity is revealed; keep real secrets in your private DM notes.

`censorship.characterWidthEm` controls each glyph's fixed-width slot (0.5–2, default 0.85), and `censorship.letterSpacingEm` adds letter spacing (0–0.5, default 0). The compact scramble has no extra gaps between character groups. Smaller widths tighten the letters; fixed slots keep the layout stable during cycling.

## Customize meters and add more values

Edit the `metrics` array in `assets/site-config.json`. Each entry defines one meter. Array order controls display order: faction cards show two meters per row, with additional meters continuing below in the same style; narrow screens and dossier panels show one per row. With an odd meter count, the last meter spans the full row. There is no fixed two-meter limit.

| Setting | What it controls |
| --- | --- |
| `field` | Exact Google Sheets column header or JSON numeric property, such as `awareness`. Changing `name` does not require renaming this field. |
| `name` | Visible meter title, such as `Awareness`, `Reputation`, or `Influence`. |
| `min`, `max` | Allowed numeric range and meter endpoints. Fractions are supported. |
| `baseline` | Optional starting point for fills that extend in either direction, such as opinion's `0`. Omit or set to `null` to fill from `min`. Must be strictly between the limits. |
| `suffix` | Text after the number, such as `%`, ` points`, or an empty string. |
| `showPlus` | Whether positive numbers display a `+`. |
| `color` | Default fill/thumb color: a CSS color, a theme variable such as `var(--accent)`, or `{ "dark": "#b0d39b", "light": "#376448" }`. |
| `bands` | Ordered value ranges with editable labels and optional color overrides. |

Each band has `max` and `label`, and can have `color` and `exclusive`. The first matching band supplies the label and color. By default its upper bound is inclusive (`value <= max`); `exclusive: true` means `value < max`. Band limits must increase and stay inside the meter limits; the last band must include the meter's `max`. You can use any number of bands. A band color overrides the meter's color. Theme colors (`var(--accent)`, `var(--danger)`, `var(--success)`, `var(--muted)`) follow palette changes automatically; literal colors stay fixed unless you supply separate dark/light values.

The supplied config includes Influence as its third meter, using a 0–10 scale: 0–3 Limited, above 3 through 7 Established, and above 7 through 10 Dominant. Its definition is:

```json
{
  "field": "influence",
  "name": "Influence",
  "min": 0,
  "max": 10,
  "suffix": " / 10",
  "showPlus": false,
  "color": { "dark": "#b0d39b", "light": "#376448" },
  "bands": [
    { "max": 3, "label": "Limited" },
    { "max": 7, "label": "Established" },
    { "max": 10, "label": "Dominant", "color": "var(--accent)" }
  ]
}
```

The sample JSON already has `influence` values. Add an `influence` column in Google Sheets and populate every faction row before refreshing with this configuration. To add another meter, copy this definition with a unique `field`, customize its name and bands, and add the matching column/property to your data. Every faction needs a numeric value for every configured meter. Use plain numbers in the data; display suffixes belong in the config. Remove a meter's config entry to stop displaying/requiring it; its data column may remain. Refresh standings reloads both the configuration and values. Invalid definitions or missing/out-of-range values leave the previous successful display intact and show an error.

The supplied config uses `metrics` as the source of meter customization. `text.meterValue` controls the `{label} · {value}` format, and `text.factionAction` uses `{meters}` for accessible descriptions of all configured meters.

Update `updatedAt` when you change JSON standings, then click Refresh standings. Customize the sample-campaign footer through `text.footerLeft` and `text.footerRight` in `assets/site-config.json`.

## Publish on GitHub Pages

Commit `index.html`, `.nojekyll`, `assets/`, `LICENSE`, and `tools/starter-LICENSE` to your repository. Enable GitHub Pages under Settings → Pages using the desired branch and repository root. URLs are relative so the app can run under a repository path or custom domain. No build command or backend is required. Do not copy the source projects' CNAME files unless you intend to configure your own domain.

Before deployment, set your campaign text and footer in `assets/site-config.json`, confirm the configured data source and every metric field, and run the checks below. Sheets mode is currently configured to the public test sheet. All faction data shipped in `assets/`, including the sample JSON, is downloadable even if Sheets mode is selected. The tools folder contains the local preview server, checks, and retained license notice; it is not needed to run the deployed app.

## Supported data sources

To use Google Sheets, set `dataSource` to `sheets` and set `googleSheets.spreadsheetId` to the ID between `/d/` and `/edit` in the viewer link. Leave `gid` and `sheet` empty to read the first tab, set `gid` to a tab's numeric ID (including `0`), or set `sheet` to a tab name. A nonempty `sheet` takes precedence over `gid`. The supplied config is connected to the public test sheet. Set `dataSource` back to `json` to use the retained `dataUrl`.

The sheet's first row contains `id`, `name`, `symbol`, `category`, `awareness`, `opinion`, `influence`, `blurb`, `contact`, and `location` for the default configuration. Columns can be reordered. Required columns are `id`, `name`, and each configured metric's `field`; IDs must be unique, names nonempty, and meter values plain numbers within their configured ranges. Blank rows are ignored. Quoted commas, quotation marks, and multiline notes are supported. An optional `updatedAt` column supplies the footer date from its first nonempty faction row; without it, the footer shows the last successful sync time, not the sheet's edit time.

Give the sheet **Anyone with the link → Viewer** access. Only include player-facing data. Click Refresh standings to fetch changes; Google may cache the feed briefly. Failed refreshes retain previously loaded factions and the last successful timestamp, with an error shown below the frame. There is no automatic fallback to sample JSON. `text.sheetsSourceBadge` and `text.lastSynced` customize the Sheets badge and timestamp.

Run `node tools/sheets.test.cjs` to check CSV parsing and tab configuration.
Run `node tools/metrics.test.cjs` to check configurable meter boundaries, extra data fields, and definition validation. With Playwright and Microsoft Edge available, `node tools/metrics-browser.test.cjs` checks four meters against simulated JSON/Sheets feeds on desktop and mobile (an optional argument supplies the Playwright module path).

Two configurable sources use the same faction fields:

- **JSON:** A file shipped with the site containing faction IDs, names, awareness, opinion, and player-facing notes. The DM updates the file and republishes the site.
- **Google Sheets:** A public viewer sheet supplies the same faction fields through its CSV feed. The tracker fetches with credentials omitted; player accounts and API keys are not required.

## Optional backend for experienced users

GitHub Pages serves static files and cannot itself authenticate edits or save changes to shared storage. Experienced users can connect the static interface to an authenticated backend, such as Supabase Auth with database access policies, or a Cloudflare Worker with persistent storage and server-side authentication. Players should have read access only to published faction data, and writes should be restricted to authorized DMs.

## Project status

The JSON GUI is implemented with six fictional sample factions, faction notes, search, refresh, and four paired light/dark palettes. Google Sheets integration is enabled with the public test sheet.

## Credits and license

App by TechInTheKitchen. Theme palettes and the local launcher/server are adapted from Stars, Stones & Salt Tarot, which uses the Obsidian Reader starter. Software is MIT licensed; see `LICENSE` and the retained `tools/starter-LICENSE` notice. Bundled fonts use the SIL Open Font License; see each `assets/fonts/*/OFL.txt` file. No tarot artwork or card data is included.
