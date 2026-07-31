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

const pick = (arr, i) => arr[i % arr.length]
const TABLE = Array.from({ length: 3679 }, (_, i) => {
  const n = i + 11
  const street = `${1000 + ((i * 37) % 8000)} ${pick(STREETS, i)}`
  const created = new Date(2024, 0, 1 + Math.floor(i * 0.23), 8 + (i % 10), (i * 7) % 60)
  return {
    id: 'rec' + String(n).padStart(5, '0'),
    UID: `Project#${n} - ${street}`,
    Status: pick(STATUSES, i * 3 + (i % 5)),
    'Address CONCAT': `${street}, ${pick(CITIES, i * 2)}, USA`,
    assigned_to_name: [pick(REPS, i * 2 + 1)],
    customer_name: [pick(CUSTOMERS, i * 5 + 2)],
    lob_name: [pick(LOBS, i * 3 + 1)],
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
    if (!matches(r, q.filters.client, 'customer_name')) return false
    if (!matches(r, q.filters.lob, 'lob_name')) return false
    if (!matches(r, q.filters.assigned, 'assigned_to_name')) return false
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
          clientOptions: distinct('customer_name'),
          statusOptions: distinct('Status'),
          lobOptions: distinct('lob_name'),
          assignedOptions: distinct('assigned_to_name'),
        },
        uid: 'harness',
        'onTrigger-event': onEvent,
      }),
    ])
  },
}
createApp(App).mount('#app')
