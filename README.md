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

The section owns the UI state and publishes it two ways — use whichever fits:

1. **Component variable `query`** (no workflow needed). Bind the collection's own
   fields to it:
   | Collection field | Bind to |
   | --- | --- |
   | Filter formula | `Projects — List › query.filterByFormula` |
   | Limit | `query.limit` |
   | Offset | `query.offset` |
   | Sort | `query.sort` |
2. **`queryChange` event** — fires on every search, filter, sort, page and page-size
   change. `event.query` carries the identical object. Bind it to a workflow that
   fetches `projects_search` with those parameters.

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
- **Status** (plain text column) — `OR({Status} = "Completed", {Status} = "Canceled")`
- **Client / LOB / Assigned To** (lookup arrays) — delimiter-guarded so
  `Kane Sanders` can't match `Kane Sanderson`:
  `FIND("|" & "Kane Sanders" & "|", "|" & ARRAYJOIN({customer_name}, "|") & "|")`
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
- **Toolbar** — search, four multi-select filter dropdowns, an optional created-date
  range, a column picker, and a table/cards toggle. Selected values become
  removable chips.
- **Table** — sortable headers, sticky Title column while the rest scrolls
  sideways, status pills, LOB tags, currency-formatted amounts, and a per-row
  action button. Loading bar + skeleton rows while a page is in flight.
- **Cards** — the same data as cards; the section switches to a single column in
  narrow containers on its own.
- **Pager** — first / prev / numbered pages with ellipses / next / last, a
  rows-per-page picker, and a go-to-page box once there are more than 5 pages.

## Filters

All four filters are multi-select and **each one binds to its own list**:

| Filter | Options property | Matched against |
| --- | --- | --- |
| Client | `clientOptions` | `customer_name` |
| Status | `statusOptions` | `Status` |
| LOB | `lobOptions` | `lob_name` |
| Assigned To | `assignedOptions` | `assigned_to_name` |

An options list can be an array of strings, or of rows — set the matching
*option label field* / *option value field* (both default to `name`) to say which
columns to read. **The value must be the text that appears in the project row**,
because that is what the formula matches on.

Leave a list unbound and the options fall back to the distinct values found in the
loaded rows. In server mode that is only the current page, so bind real lists.

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

## Events

`queryChange` (the one that matters), `pageChange`, `searchChange`, `filterChange`,
`sortChange`, `refresh`, `projectClick` (carries `index`, `id`, and the full `item`
row — bind it to navigate to the project page), `createProject`, `exportCsv`.

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
