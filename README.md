# Projects — List — WeWeb coded section

A [WeWeb](https://www.weweb.io/) coded **section** that replaces the native grid on
the Projects page. It exists for one reason: **WeWeb's grid can't paginate on the
backend**, so every filter change pulls thousands of Airtable rows into the browser.
This section never fetches anything itself — it publishes a *query* (page, sort,
filters, and a ready-made `filterByFormula`) and renders whatever page you hand back.

Same `vd-`/`pl-` design system as the Vendor Detail, Insurance Audit and Product
Roadmap sections: CSS-variable theming, light/dark/auto, container queries, no
runtime dependencies.

## How the pagination works

The section owns the UI state and publishes it through the **`queryChange`** event,
which fires on every search, filter, sort, page and page-size change.
`event.query` carries the whole request. Wire it like this:

1. Create one **page variable**, type Object — e.g. `projectsQuery`.
2. Section → Events → **On query change** → workflow, in this order:
   1. *Change variable* → `projectsQuery` = `event.query`
   2. *Fetch collection* → `projects_search`

   The order matters: fetching before the variable is set refetches with the
   **previous** query.
3. Bind the collection's own config fields to that variable (JS bindings):

   | Collection field | Binding |
   | --- | --- |
   | Filter by formula | `return variables['<uuid>']?.filterByFormula \|\| ""` |
   | Limit | `return variables['<uuid>']?.limit ?? 25` |
   | Offset | `return variables['<uuid>']?.offset ?? 0` |

Leave the collection's **auto-fetch off** — the workflow drives every fetch,
including the first one (the section fires `queryChange` on mount, see
`fetchOnMount`).

> **Not the component variable.** The section also calls
> `wwLib.wwVariable.useComponentVariable` to expose `query`, which would let a
> collection bind straight to it with no workflow at all. That only works for
> coded *elements*: component variables are keyed `<elementUid>-<name>`, and a
> coded **section** receives no `uid`, so the variable registers as
> `undefined-query`, shows in the editor as "Element undefined - query", and never
> leaves its `{}` default. The call is harmless and is kept in case the section is
> ever converted to an element — but do not wire against it.

Then bind back:

| Section property | Bind to |
| --- | --- |
| **Rows** | `projects_search.data` |
| **Total count** | `projects_search.total` |
| **Loading** | `projects_search.isFetching` |

`totalCount` is what the pager counts pages from — it must be the **server's**
unpaged total, not `rows.length`. Leave it unbound and the pager collapses to a
single page.

The `query` object:

```js
{
  page: 3, pageSize: 25, limit: 25, offset: 50,
  search: "shiloh jerry",
  filters: { search, client: [], status: [], lob: [], assigned: [], createdFrom: "", createdTo: "" },
  sortField: "creation_date", sortDirection: "desc",
  sort: [{ field: "creation_date", direction: "desc" }],
  filterByFormula: 'AND(...)',
  reason: "page",            // init | search | filter | sort | page | pageSize | refresh
}
```

### The generated formula

`filterByFormula` is built for the `projects_search` collection's own columns:

- **Search** — every word must appear in the concatenated `search_query` column:
  `AND(FIND("shiloh", LOWER({search_query})), FIND("jerry", LOWER({search_query})))`
- **Status** (plain text column, no id) — `OR({Status} = "Completed", {Status} = "Canceled")`
- **Client / LOB / Assigned To** — matched on **ids**, not names, so renaming a
  customer or a rep never breaks a saved filter. Delimiter-guarded so one id can
  never match another that starts with it:
  `FIND("|" & "recJZhAAHUPMa2TkZ" & "|", "|" & ARRAYJOIN({Customer}, "|") & "|")`
- **Amount range** — unquoted numeric comparisons:
  `AND({Approved Revenue} >= 1000, {Approved Revenue} <= 5000)`
- **Created range** — inclusive on both ends via `IS_BEFORE` / `DATEADD`.

Everything is joined with `AND(...)`; with nothing selected it is an empty string.
Not on Airtable? Ignore it and build your own query from the raw `filters` object.

### Client-side mode

Turn **Server-side data** off and the section filters, sorts and pages the bound
array itself — handy for a small list, or for previewing in the editor. Everything
else behaves identically.

> Safety net: in server mode, if more rows arrive than fit one page (a collection
> left on auto-fetch-everything), the section slices locally rather than dumping
> 3,000+ rows into the DOM.

## What it shows

- **Header** — title, live total, the visible range, active-filter count, and
  Refresh / CSV / Create Project. Optional summary tiles (total, rows on page,
  approved revenue on page).
- **Toolbar** — search, four multi-select filter dropdowns, an amount range, an
  optional created-date range, a column picker, and a table/cards toggle.
  Selected values become removable chips.
- **Table** — sortable headers, status pills, LOB tags, currency-formatted
  amounts, and a loading bar + skeleton rows while a page is in flight. **Title is
  pinned left and Actions pinned right**, so both stay put while the middle of a
  wide row scrolls sideways.
- **Cards** — the same data as cards; the section switches to a single column in
  narrow containers on its own.
- **Pager** — first / prev / numbered pages with ellipses / next / last, a
  rows-per-page picker, and a go-to-page box once there are more than 5 pages.

## Filters

All four filters are multi-select and **each one binds to its own list**:

The three relational filters match on **ids** while displaying names — a project
row carries both, as parallel lookups:

| Filter | Bind options to | Option value field | Matched against |
| --- | --- | --- | --- |
| Client | Customers collection | `id` (Airtable rec id) | `Customer` |
| Status | a static array of strings | *(the text itself)* | `Status` |
| LOB | LOBs collection | `id` (**Supabase uuid**) | `lob_supabase_id` |
| Assigned To | Users collection | `airtable_record_id` | `assigned_to_id` |

Matching on ids means renaming a customer or a rep never breaks a saved filter.
The *option value field* defaults already match those collections. Watch the LOB
one: that collection carries **both** `id` (Supabase uuid) and
`airtable_record_id`, while the project column holds the **uuid** — picking the
wrong one silently returns zero rows.

The *option label field* is what the user sees (`UID` for customers, `name` for
LOBs and users) and drives the dropdown, the button, and the chips. The match
column for each filter is configurable under settings via `fieldCustomerId`,
`fieldLobId` and `fieldAssignedId`.

> **Airtable gotcha:** referencing a *link* field in a formula yields the linked
> records' primary-field text, not their record ids. `Customer`, `assigned_to_id`
> and `lob_supabase_id` must therefore be lookups (or rollups) of an id field on
> the linked record — not the link field itself.

**Amount** is a range rather than a list: a Min/Max pair plus quick-pick buttons.
The ranges come from **amountPresets** as `min-max` pairs, either end optional —
the default `-1000,1000-5000,5000-25000,25000-` renders as *Under $1,000*,
*$1,000–$5,000*, *$5,000–$25,000*, *$25,000+*. Labels are generated from the values,
so there is no separate label syntax. Clicking the active preset clears it. Rows
with no amount never satisfy a range.

An options list can be an array of strings, or of rows — the *option label field*
and *option value field* props say which columns to read, comma-separated with the
first present key winning.

Leave a list unbound and the options fall back to distinct ids found in the loaded
rows, labelled from the parallel `*_name` column. In server mode that is only the
current page, so bind real lists.

Each filter can be hidden with its `show…Filter` toggle.

## Columns

Ordered, comma-separated keys in **visibleColumns**:

`title, status, address, assigned, customer, amount, wo, created, lob, actions`

The in-toolbar column picker overrides it per user, and Reset returns to the
property. Which row column feeds each cell is set under **settings** (`fieldTitle`,
`fieldStatus`, …), comma-separated, first key present on the row wins. The defaults
already match `projects_search`:

| Cell | Column |
| --- | --- |
| Title | `UID` |
| Status | `Status` |
| Address | `Address CONCAT` |
| Assigned To | `assigned_to_name` |
| Customer | `customer_name` |
| Amount | `Approved Revenue` |
| WO# | `WO#` |
| Created | `creation_date`, then `Creation Date` |
| LOB | `lob_name` |
| *(search target)* | `search_query` |

The first name in each list is what gets emitted as the Airtable sort field, so
keep the real column first.

## Row actions

The pinned Actions column holds two buttons:

- **View Details** (`actionLabel`) — fires `projectClick`. Hide it with
  **showViewDetails**.
- **Open in new tab** — set **newTabUrl** to a template and it opens that page in a
  new browser tab; `{placeholders}` are filled from the row and URL-encoded.
  `{id}`, `{title}`, `{status}`, `{wo}`, `{customer}`, `{assigned}`, `{address}`,
  `{amount}`, `{created}` come from the rendered cells, and any other name falls
  through to the raw collection column — so `/projects/{id}` and
  `{Stacker Display}` both work. Leave the URL empty and the button only fires
  `openNewTab` (carrying the resolved `url`, `id` and full `item`), so a workflow
  can handle navigation instead. Hide it with **showOpenNewTab**.

Turn **both** off and the Actions column drops out of the table entirely, rather
than leaving an empty pinned column taking up width.

Both stop the click from bubbling, so neither triggers the row-click handler.
`window.open` runs synchronously inside the click — anything else gets eaten by
the popup blocker. Note that rows stay clickable independently of these buttons;
that is **rowClickOpens**.

## Events

`queryChange` (the one that matters), `pageChange`, `searchChange`, `filterChange`,
`sortChange`, `refresh`, `projectClick` (carries `index`, `id`, and the full `item`
row — bind it to navigate to the project page), `openNewTab`, `createProject`,
`exportCsv`.

> Events are suppressed while editing in the WeWeb canvas — use **Preview** to test
> event-driven workflows. The `query` component variable still updates in the
> editor, so formula bindings preview live.

## Notes

- **CSV** exports the rows currently on screen. In server mode that is one page —
  raise *Rows per page* first if you need more in a single file.
- **Search** is debounced (350 ms by default, `searchDebounce`) and several filter
  clicks in the same tick coalesce into one `queryChange`, so a burst of clicking
  is one fetch, not five.
- **fetchOnMount** publishes the opening query as the section mounts, so the first
  page loads without a separate page-load workflow.
- **debugMode** renders a panel showing the live `filterByFormula`, how many rows
  came back, whether `totalCount` is bound, plus limit/offset/sort — with a button
  that copies the formula. Paste it into Airtable's own filter box to tell a bad
  formula apart from one that never reached Airtable. Off by default.
- **bottomSpace** (default 96px) reserves clearance under the pager so a fixed
  bottom nav bar can't cover the last row. The device's `safe-area-inset-bottom`
  is added on top of it automatically. Set it to 0 if the page has no bottom nav.
- The styles are **plain CSS, not SCSS** — on purpose. `lang="scss"` pulls
  sass-loader into the WeWeb CLI's chain, which throws a Dart Sass legacy-JS-API
  deprecation warning that shows as a red "Compiled with problems" overlay in dev
  mode. The dark palette is therefore duplicated instead of mixed in; keep the
  `.vd-dark` block and the `prefers-color-scheme` block in sync.

## Develop

```bash
npm i
```

Standalone harness — fakes a 3,679-row backend that only ever returns one page, so
server-side paging, filtering and sorting are exercised for real:

```bash
npm run dev
```

Or serve it to the WeWeb editor's developer popup:

```bash
npm run serve
```

## Build

```bash
npx weweb build --name=projects-list --type=section
```
