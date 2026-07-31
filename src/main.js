import { createApp, h, ref } from 'vue'
import Section from '@pl-section'
import config from '@pl-config'

// Standalone dev harness. It fakes the backend the section expects: a table of
// 3,679 projects that only ever hands back ONE page, so server-side pagination,
// filtering and sorting are exercised for real.
function defaults(cfg) { const c = {}; for (const [k, v] of Object.entries(cfg.properties || {})) c[k] = v.defaultValue; return c }
const base = defaults(config)

const STATUSES = ['Completed', 'Canceled', 'In Progress', 'Scheduled', 'On Hold', 'Lead']
const LOBS = ['Repipe', 'Maintenance', 'Water Heater', 'Drain', 'Slab Leak']
const REPS = ['Amanda Terranova', 'Charlie Binder', 'Chase Eby', 'Walter Gaw', 'Peter Richmond']
const CUSTOMERS = ['Jerry Todd', 'Kane Sanders', 'Ernest Latimore', 'Linda Lu', 'Jon Talley', 'Kyle and Hannah Keener', 'Repipe Specialists - Sales', 'Maria Delgado']
const STREETS = ['Matty Drive Northeast', 'Wilshire Drive Southwest', 'Mathews Street', 'Dogwood Park Drive', 'Valley Reserve Drive Northwest', 'Loughridge Drive', 'Mitchell Chase Trail', 'Kendall Station Northwest', 'Shiloh Road Northwest', 'Havenwood Court']
const CITIES = ['Marietta, GA 30066', 'Smyrna, GA 30080', 'Lawrenceville, GA 30046', 'Kennesaw, GA 30152', 'Buford, GA 30519', 'Mableton, GA 30126', 'Acworth, GA 30101', 'Woodstock, GA 30188']

// Id maps mirroring the real collections: customers and users are keyed by
// Airtable record id, LOBs by their Supabase uuid.
const LOB_ID = { Repipe: 'f737c863-bb4e-4088-88de-92aa7848179f', Maintenance: 'f38a8ca9-206c-47d3-b5f5-a2b18978ca4a', 'Water Heater': '687b15d4-a26e-4d94-beba-94831d814274', Drain: '9c1d5e77-1b2a-4c3d-8e4f-5a6b7c8d9e01', 'Slab Leak': '3f2e1d0c-9b8a-4756-a1b2-c3d4e5f60718' }
const REP_ID = Object.fromEntries(REPS.map((n, i) => [n, 'recUSER' + String(i + 1).padStart(5, '0')]))
const CUST_ID = Object.fromEntries(CUSTOMERS.map((n, i) => [n, 'recCUST' + String(i + 1).padStart(5, '0')]))

const pick = (arr, i) => arr[i % arr.length]
const TABLE = Array.from({ length: 3679 }, (_, i) => {
  const n = i + 11
  const street = `${1000 + ((i * 37) % 8000)} ${pick(STREETS, i)}`
  const created = new Date(2024, 0, 1 + Math.floor(i * 0.23), 8 + (i % 10), (i * 7) % 60)
  // REPS and LOBS are both length 5, so two plain linear indexes of `i` would be
  // perfectly correlated and every combined filter would look like a no-op. The
  // floor terms break that.
  const rep = pick(REPS, i * 2 + Math.floor(i / 5) + 1)
  const cust = pick(CUSTOMERS, i * 5 + 2)
  const lob = pick(LOBS, i * 3 + Math.floor(i / 7) + 1)
  return {
    id: 'rec' + String(n).padStart(5, '0'),
    UID: `Project#${n} - ${street}`,
    Status: pick(STATUSES, i * 3 + (i % 5)),
    'Address CONCAT': `${street}, ${pick(CITIES, i * 2)}, USA`,
    // Names are displayed; the parallel *_id lookups are what filters match on.
    assigned_to_name: [rep],
    customer_name: [cust],
    lob_name: [lob],
    assigned_to_id: [REP_ID[rep]],
    Customer: [CUST_ID[cust]],
    lob_supabase_id: [LOB_ID[lob]],
    'Approved Revenue': ((i * 1373) % 24000) + 450,
    'WO#': 'WO#' + (11000 + n),
    creation_date: created.toISOString(),
    search_query: `Project#${n} - ${street} - ${pick(CUSTOMERS, i * 5 + 2)}`,
  }
})

const SORT_KEYS = { UID: 'UID', Status: 'Status', 'Address CONCAT': 'Address CONCAT', assigned_to_name: 'assigned_to_name', customer_name: 'customer_name', 'Approved Revenue': 'Approved Revenue', 'WO#': 'WO#', creation_date: 'creation_date', lob_name: 'lob_name' }

// Stands in for the Airtable fetch: applies the query the section published and
// returns just that page, plus the unpaged total.
function fakeFetch(q) {
  const term = (q.filters.search || '').toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (row, list, key) => !list.length || list.some(v => [].concat(row[key]).indexOf(v) !== -1)
  let rows = TABLE.filter(r => {
    if (term.length && !term.every(w => r.search_query.toLowerCase().includes(w))) return false
    if (!matches(r, q.filters.status, 'Status')) return false
    if (!matches(r, q.filters.client, 'Customer')) return false
    if (!matches(r, q.filters.lob, 'lob_supabase_id')) return false
    if (!matches(r, q.filters.assigned, 'assigned_to_id')) return false
    if (q.filters.amountMin != null && r['Approved Revenue'] < q.filters.amountMin) return false
    if (q.filters.amountMax != null && r['Approved Revenue'] > q.filters.amountMax) return false
    if (q.filters.createdFrom && r.creation_date < q.filters.createdFrom) return false
    if (q.filters.createdTo && r.creation_date > q.filters.createdTo + 'T23:59:59Z') return false
    return true
  })
  const key = SORT_KEYS[q.sortField]
  if (key) {
    const dir = q.sortDirection === 'asc' ? 1 : -1
    rows = rows.slice().sort((a, b) => {
      const x = [].concat(a[key])[0], y = [].concat(b[key])[0]
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir
    })
  }
  return { data: rows.slice(q.offset, q.offset + q.limit), total: rows.length }
}

// Option lists shaped like the real collections, so the label/value field props
// are exercised: customers expose UID+id, LOBs name+id, users name+airtable_record_id.
const CUSTOMER_ROWS = CUSTOMERS.map(n => ({ UID: n, id: CUST_ID[n], airtable_id: CUST_ID[n] }))
const LOB_ROWS = LOBS.map(n => ({ name: n, id: LOB_ID[n], airtable_record_id: 'recLOB' + n.slice(0, 3) }))
const USER_ROWS = REPS.map(n => ({ name: n, airtable_record_id: REP_ID[n], whalesync_postgres_id: 'uuid-' + REP_ID[n] }))
const distinct = key => [...new Set(TABLE.flatMap(r => [].concat(r[key])))].sort()

const App = {
  setup() {
    const rows = ref([])
    const total = ref(0)
    const loading = ref(false)
    const theme = ref('auto')
    const density = ref('compact')
    const lastQuery = ref(null)
    // Flip to exercise the client-side path: the section then filters, sorts and
    // pages whatever rows it was handed instead of asking for a new page.
    const server = ref(true)
    let timer = null

    const onEvent = e => {
      if (e.name !== 'queryChange') { console.log('EVENT', e.name, e.event); return }
      lastQuery.value = e.event.query
      loading.value = true
      if (timer) clearTimeout(timer)
      // A deliberate delay so the loading bar and dimming are visible.
      timer = setTimeout(() => {
        const res = fakeFetch(e.event.query)
        rows.value = res.data
        total.value = res.total
        loading.value = false
      }, 320)
    }

    const btn = 'padding:6px 10px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;font:inherit'
    return () => h('div', [
      h('div', { style: 'display:flex;gap:10px;margin-bottom:12px;align-items:center;flex-wrap:wrap;font:13px Inter,system-ui,sans-serif' }, [
        h('button', { style: btn, onClick: () => theme.value = ({ auto: 'light', light: 'dark', dark: 'auto' })[theme.value] }, 'theme: ' + theme.value),
        h('button', { style: btn, onClick: () => density.value = density.value === 'compact' ? 'comfortable' : 'compact' }, 'density: ' + density.value),
        h('button', { style: btn, onClick: () => server.value = !server.value }, 'mode: ' + (server.value ? 'server' : 'client')),
        h('span', { style: 'opacity:.6' }, lastQuery.value ? `offset ${lastQuery.value.offset} · limit ${lastQuery.value.limit} · ${lastQuery.value.filterByFormula || 'no formula'}` : 'waiting for first query…'),
      ]),
      h(Section, {
        content: {
          ...base,
          rows: rows.value,
          totalCount: total.value,
          loading: loading.value,
          serverMode: server.value,
          showStats: true,
          showDateFilter: true,
          newTabUrl: '/project/{id}',
          darkMode: theme.value,
          density: density.value,
          clientOptions: CUSTOMER_ROWS,
          statusOptions: distinct('Status'),
          lobOptions: LOB_ROWS,
          assignedOptions: USER_ROWS,
        },
        uid: 'harness',
        'onTrigger-event': onEvent,
      }),
    ])
  },
}
createApp(App).mount('#app')
