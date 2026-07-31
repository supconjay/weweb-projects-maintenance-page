<template>
  <div class="vd-root" :class="[themeClass, densityClass]" :style="rootStyle">
   <div class="vd-inner">
    <!-- ============================ HEADER ============================ -->
    <header class="vd-header">
      <div class="pl-headrow">
        <div class="pl-headmeta">
          <h1 class="vd-header__name">{{ content.title || 'Projects' }}</h1>
          <p class="vd-card__sub">
            <template v-if="content.subtitle">{{ content.subtitle }}</template>
            <template v-else>
              <strong class="pl-total">{{ nf(total) }}</strong> {{ total === 1 ? 'project' : 'projects' }}
              <template v-if="total"> · showing {{ rangeText }}</template>
              <template v-if="activeFilterCount"> · {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} on</template>
            </template>
          </p>
        </div>

        <div class="pl-headactions">
          <button v-if="content.showRefresh !== false" type="button" class="vd-btn" :disabled="!!content.loading" @click="refresh">
            <svg class="vd-svg" :class="{ 'pl-spin': content.loading }" v-bind="svgAttrs"><path :d="ic('refresh')"></path></svg>
            Refresh
          </button>
          <button v-if="content.showExport !== false" type="button" class="vd-btn" :disabled="!displayRows.length" @click="exportCsv">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('download')"></path></svg> CSV
          </button>
          <button v-if="content.showCreate !== false" type="button" class="vd-btn vd-btn--primary" @click="fireEvent('createProject', {})">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('plus')"></path></svg> {{ content.createLabel || 'Create Project' }}
          </button>
        </div>
      </div>

      <!-- summary tiles -->
      <div v-if="content.showStats" class="pl-stats">
        <div class="pl-stat">
          <span class="pl-stat__label"><svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('folder')"></path></svg> Total</span>
          <span class="pl-stat__value">{{ nf(total) }}</span>
          <span class="pl-stat__sub">{{ activeFilterCount ? 'matching filters' : 'all projects' }}</span>
        </div>
        <div class="pl-stat pl-stat--info">
          <span class="pl-stat__label"><svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('list')"></path></svg> On this page</span>
          <span class="pl-stat__value">{{ displayRows.length }}</span>
          <span class="pl-stat__sub">page {{ page }} of {{ totalPages }}</span>
        </div>
        <div class="pl-stat pl-stat--success">
          <span class="pl-stat__label"><svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('dollar')"></path></svg> Page value</span>
          <span class="pl-stat__value">{{ money(pageAmount) }}</span>
          <span class="pl-stat__sub">approved revenue, this page</span>
        </div>
      </div>
    </header>

    <!-- ============================ TOOLBAR ============================ -->
    <div class="vd-card pl-toolbar">
      <div class="pl-toolbar__row">
        <div v-if="content.showSearch !== false" class="pl-search">
          <svg class="vd-svg pl-search__icon" v-bind="svgAttrs"><path :d="ic('search')"></path></svg>
          <input
            class="pl-search__input" type="search" :placeholder="content.searchPlaceholder || 'Search projects…'"
            :aria-label="content.searchPlaceholder || 'Search projects'" v-model="search"
          />
          <button v-if="search" type="button" class="pl-search__clear" aria-label="Clear search" @click="search = ''">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('x')"></path></svg>
          </button>
        </div>

        <!-- one dropdown per filter, each fed by its own bound list -->
        <div v-for="f in filterDefs" :key="f.key" class="pl-dd">
          <button
            type="button" class="pl-dd__btn" :class="{ 'pl-dd__btn--on': f.selected.length, 'pl-dd__btn--open': openDd === f.key }"
            :aria-expanded="openDd === f.key ? 'true' : 'false'" @click.stop="toggleDd(f.key)"
          >
            <span class="pl-dd__text">{{ f.label }}</span>
            <span v-if="f.selected.length === 1" class="pl-dd__one">{{ labelFor(f, f.selected[0]) }}</span>
            <span v-else-if="f.selected.length" class="pl-dd__count">{{ f.selected.length }}</span>
            <svg class="vd-svg pl-dd__chev" v-bind="svgAttrs"><path :d="ic('chevron-down')"></path></svg>
          </button>

          <div v-if="openDd === f.key" class="pl-dd__menu" @click.stop>
            <div class="pl-dd__searchwrap">
              <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('search')"></path></svg>
              <input
                ref="ddSearch" class="pl-dd__search" type="text" v-model="ddQuery"
                :placeholder="'Filter ' + f.label.toLowerCase() + '…'" :aria-label="'Filter ' + f.label"
              />
            </div>
            <div class="pl-dd__list">
              <label v-for="o in ddOptions(f)" :key="o.value" class="pl-dd__opt">
                <input type="checkbox" :checked="f.selected.indexOf(o.value) !== -1" @change="toggleFilterValue(f.key, o.value)" />
                <span class="pl-dd__optlabel">{{ o.label }}</span>
              </label>
              <p v-if="!ddOptions(f).length" class="pl-dd__none">
                {{ f.optionsBound ? 'Nothing matches' : 'No options — bind a list for this filter' }}
              </p>
            </div>
            <div class="pl-dd__foot">
              <button type="button" class="pl-dd__link" :disabled="!f.selected.length" @click="clearFilter(f.key)">Clear</button>
              <span class="pl-dd__spacer"></span>
              <button type="button" class="pl-dd__link pl-dd__link--strong" @click="openDd = null">Done</button>
            </div>
          </div>
        </div>

        <!-- amount range -->
        <div v-if="content.showAmountFilter !== false" class="pl-dd">
          <button
            type="button" class="pl-dd__btn" :class="{ 'pl-dd__btn--on': amountActive, 'pl-dd__btn--open': openDd === '__amount' }"
            :aria-expanded="openDd === '__amount' ? 'true' : 'false'" @click.stop="toggleDd('__amount')"
          >
            <span class="pl-dd__text">{{ content.amountLabel || 'Amount' }}</span>
            <span v-if="amountActive" class="pl-dd__one">{{ amountSummary }}</span>
            <svg class="vd-svg pl-dd__chev" v-bind="svgAttrs"><path :d="ic('chevron-down')"></path></svg>
          </button>

          <div v-if="openDd === '__amount'" class="pl-dd__menu" @click.stop>
            <div class="pl-amount">
              <div class="pl-amount__row">
                <label class="pl-amount__field">
                  <span class="pl-amount__lbl">Min</span>
                  <input class="pl-amount__input" type="number" inputmode="decimal" step="100" placeholder="Any" aria-label="Minimum amount" v-model.lazy="amountMin" />
                </label>
                <label class="pl-amount__field">
                  <span class="pl-amount__lbl">Max</span>
                  <input class="pl-amount__input" type="number" inputmode="decimal" step="100" placeholder="Any" aria-label="Maximum amount" v-model.lazy="amountMax" />
                </label>
              </div>
              <p v-if="amountInvalid" class="pl-amount__err">Min is above max — nothing can match.</p>
              <div v-if="amountPresets.length" class="pl-amount__presets">
                <button
                  v-for="p in amountPresets" :key="p.label" type="button"
                  class="pl-amount__preset" :class="{ 'pl-amount__preset--on': presetOn(p) }" @click="applyAmountPreset(p)"
                >{{ p.label }}</button>
              </div>
            </div>
            <div class="pl-dd__foot">
              <button type="button" class="pl-dd__link" :disabled="!amountActive" @click="clearAmount">Clear</button>
              <span class="pl-dd__spacer"></span>
              <button type="button" class="pl-dd__link pl-dd__link--strong" @click="openDd = null">Done</button>
            </div>
          </div>
        </div>

        <!-- created-date range -->
        <div v-if="content.showDateFilter" class="pl-dates">
          <label class="pl-dates__label" :for="uid + '-from'">Created</label>
          <input :id="uid + '-from'" class="pl-dateinput" type="date" v-model="createdFrom" aria-label="Created from" />
          <span class="pl-dates__sep">→</span>
          <input class="pl-dateinput" type="date" v-model="createdTo" aria-label="Created to" />
        </div>

        <span class="pl-toolbar__spacer"></span>

        <!-- column picker -->
        <div v-if="content.showColumnPicker !== false" class="pl-dd">
          <button type="button" class="pl-dd__btn" :class="{ 'pl-dd__btn--open': openDd === '__cols' }" @click.stop="toggleDd('__cols')">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('columns')"></path></svg>
            <span class="pl-dd__text">Columns</span>
            <svg class="vd-svg pl-dd__chev" v-bind="svgAttrs"><path :d="ic('chevron-down')"></path></svg>
          </button>
          <div v-if="openDd === '__cols'" class="pl-dd__menu pl-dd__menu--right" @click.stop>
            <div class="pl-dd__list">
              <label v-for="c in ALL_COLUMNS" :key="c.key" class="pl-dd__opt">
                <input type="checkbox" :checked="activeColumnKeys.indexOf(c.key) !== -1" @change="toggleColumn(c.key)" />
                <span class="pl-dd__optlabel">{{ c.label || 'Actions' }}</span>
              </label>
            </div>
            <div class="pl-dd__foot">
              <button type="button" class="pl-dd__link" @click="resetColumns">Reset</button>
              <span class="pl-dd__spacer"></span>
              <button type="button" class="pl-dd__link pl-dd__link--strong" @click="openDd = null">Done</button>
            </div>
          </div>
        </div>

        <div class="pl-viewtoggle" role="group" aria-label="Layout">
          <button type="button" class="pl-viewbtn" :class="{ 'pl-viewbtn--on': view === 'table' }" aria-label="Table" @click="view = 'table'">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('list')"></path></svg>
          </button>
          <button type="button" class="pl-viewbtn" :class="{ 'pl-viewbtn--on': view === 'cards' }" aria-label="Cards" @click="view = 'cards'">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('grid')"></path></svg>
          </button>
        </div>
      </div>

      <!-- active filter chips -->
      <div v-if="activeChips.length" class="pl-chips">
        <span class="pl-chips__label">Filters</span>
        <button v-for="chip in activeChips" :key="chip.key + ':' + chip.value" type="button" class="pl-chip" @click="removeChip(chip)">
          <span class="pl-chip__k">{{ chip.group }}</span>{{ chip.label }}
          <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('x')"></path></svg>
        </button>
        <button type="button" class="pl-chip pl-chip--clear" @click="clearAll">Clear all</button>
      </div>

      <!-- diagnostics: exactly what is being published, and what came back -->
      <div v-if="content.debugMode" class="pl-debug">
        <div class="pl-debug__head">
          <strong>Query debug</strong>
          <span class="pl-debug__spacer"></span>
          <button type="button" class="pl-dd__link pl-dd__link--strong" @click="copyFormula">{{ copied ? 'Copied' : 'Copy formula' }}</button>
        </div>
        <dl class="pl-debug__grid">
          <div><dt>rows received</dt><dd>{{ rawRows.length }}</dd></div>
          <div>
            <dt>totalCount</dt>
            <dd :class="{ 'pl-debug__bad': !totalBound }">{{ totalBound ? content.totalCount : 'NOT BOUND' }}</dd>
          </div>
          <div><dt>limit</dt><dd>{{ pageSize }}</dd></div>
          <div><dt>offset</dt><dd>{{ offset }}</dd></div>
          <div><dt>sort</dt><dd>{{ airtableSortField || '—' }} {{ sortDirection }}</dd></div>
          <div><dt>loading</dt><dd>{{ content.loading ? 'yes' : 'no' }}</dd></div>
        </dl>
        <pre class="pl-debug__code">{{ filterByFormula || '(no filters active — formula is empty)' }}</pre>
      </div>
    </div>

    <!-- ============================ TABLE ============================ -->
    <div class="vd-card pl-tablecard" :class="{ 'pl-busy': content.loading }">
      <div v-if="content.loading" class="pl-loadbar"><span></span></div>

      <!-- table view -->
      <div v-if="view === 'table'" class="pl-table__wrap">
        <table class="pl-table">
          <thead>
            <tr>
              <th
                v-for="c in columns" :key="c.key"
                :class="[{ 'vd-num': c.num, 'pl-th--sticky': c.key === 'title', 'pl-th--sortable': !!c.sortable }, 'pl-th--' + c.key]"
                :style="{ minWidth: c.minw + 'px' }"
                :aria-sort="sortField === c.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button v-if="c.sortable" type="button" class="pl-sortbtn" @click="toggleSort(c.key)">
                  {{ c.label }}
                  <svg class="vd-svg pl-sorticon" :class="{ 'pl-sorticon--on': sortField === c.key }" v-bind="svgAttrs">
                    <path :d="ic(sortField === c.key ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'sort')"></path>
                  </svg>
                </button>
                <span v-else>{{ c.label }}</span>
              </th>
            </tr>
          </thead>

          <tbody v-if="displayRows.length">
            <tr
              v-for="(r, i) in displayRows" :key="r.id || (offset + i)"
              :class="{ 'pl-tr--click': rowClickable }" @click="rowClickable && openProject(r)"
            >
              <td v-for="c in columns" :key="c.key" :class="[{ 'vd-num': c.num, 'pl-td--sticky': c.key === 'title' }, 'pl-td--' + c.key]">
                <template v-if="c.key === 'title'">
                  <span class="pl-title">{{ r.title || '—' }}</span>
                </template>

                <template v-else-if="c.key === 'status'">
                  <span class="vd-pill" :class="`vd-pill--${statusTone(r.status)}`"><span class="vd-pill__dot"></span>{{ r.status || '—' }}</span>
                </template>

                <template v-else-if="c.key === 'address'">
                  <span class="pl-addr">{{ r.address || '—' }}</span>
                </template>

                <template v-else-if="c.key === 'amount'">
                  <span :class="{ 'vd-num--strong': r.amount }">{{ r.amount == null || r.amount === '' ? '—' : money(r.amount) }}</span>
                </template>

                <template v-else-if="c.key === 'created'">
                  <span class="vd-muted">{{ fmtDate(r.created) }}</span>
                </template>

                <template v-else-if="c.key === 'lob'">
                  <span v-if="!r.lob.length" class="vd-muted">—</span>
                  <span v-for="(v, k) in r.lob" :key="k" class="pl-tag">{{ v }}</span>
                </template>

                <template v-else-if="c.key === 'actions'">
                  <div class="pl-actions">
                    <button v-if="showViewDetails" type="button" class="pl-action" @click.stop="openProject(r)">{{ content.actionLabel || 'View Details' }}</button>
                    <button
                      v-if="showNewTab" type="button" class="pl-iconbtn"
                      :title="newTabTitle" :aria-label="newTabTitle + ': ' + (r.title || 'project')"
                      @click.stop="openNewTab(r)"
                    >
                      <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('external')"></path></svg>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <span :class="{ 'vd-muted': !r[c.key] }">{{ r[c.key] || '—' }}</span>
                </template>
              </td>
            </tr>
          </tbody>

          <!-- skeleton while the first page is in flight -->
          <tbody v-else-if="content.loading">
            <tr v-for="n in 6" :key="'sk' + n" class="pl-skrow">
              <td v-for="c in columns" :key="c.key"><span class="pl-sk"></span></td>
            </tr>
          </tbody>
        </table>

        <div v-if="!displayRows.length && !content.loading" class="vd-empty">
          <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('folder')"></path></svg>
          <span>{{ content.emptyText || 'No projects match these filters' }}</span>
          <button v-if="activeFilterCount" type="button" class="vd-btn" @click="clearAll">Clear filters</button>
        </div>
      </div>

      <!-- card view -->
      <div v-else class="pl-cards">
        <article
          v-for="(r, i) in displayRows" :key="r.id || (offset + i)"
          class="pl-card" :class="{ 'pl-card--click': rowClickable }"
          @click="rowClickable && openProject(r)"
        >
          <div class="pl-card__top">
            <h2 class="pl-card__title">{{ r.title || '—' }}</h2>
            <span class="vd-pill" :class="`vd-pill--${statusTone(r.status)}`"><span class="vd-pill__dot"></span>{{ r.status || '—' }}</span>
          </div>
          <p v-if="has('address')" class="pl-card__addr">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('pin')"></path></svg>{{ r.address || '—' }}
          </p>
          <dl class="pl-card__grid">
            <div v-if="has('customer')"><dt>Customer</dt><dd>{{ r.customer || '—' }}</dd></div>
            <div v-if="has('assigned')"><dt>Assigned To</dt><dd>{{ r.assigned || '—' }}</dd></div>
            <div v-if="has('amount')"><dt>Amount</dt><dd>{{ r.amount == null || r.amount === '' ? '—' : money(r.amount) }}</dd></div>
            <div v-if="has('wo')"><dt>WO#</dt><dd>{{ r.wo || '—' }}</dd></div>
            <div v-if="has('created')"><dt>Created</dt><dd>{{ fmtDate(r.created) }}</dd></div>
            <div v-if="has('lob')"><dt>LOB</dt><dd>{{ r.lob.join(', ') || '—' }}</dd></div>
          </dl>
          <div v-if="has('actions') && hasRowActions" class="pl-card__actions">
            <button v-if="showViewDetails" type="button" class="vd-btn" @click.stop="openProject(r)">{{ content.actionLabel || 'View Details' }}</button>
            <button
              v-if="showNewTab" type="button" class="pl-iconbtn"
              :title="newTabTitle" :aria-label="newTabTitle + ': ' + (r.title || 'project')"
              @click.stop="openNewTab(r)"
            >
              <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('external')"></path></svg>
            </button>
          </div>
        </article>

        <div v-if="!displayRows.length && !content.loading" class="vd-empty">
          <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('folder')"></path></svg>
          <span>{{ content.emptyText || 'No projects match these filters' }}</span>
          <button v-if="activeFilterCount" type="button" class="vd-btn" @click="clearAll">Clear filters</button>
        </div>
      </div>

      <!-- ============================ PAGER ============================ -->
      <div class="vd-pager">
        <span class="vd-pager__info">{{ total ? rangeText + ' of ' + nf(total) : '0 results' }}</span>

        <div v-if="content.showPageSize !== false" class="pl-pagesize">
          <label class="pl-pagesize__label" :for="uid + '-ps'">Rows</label>
          <select :id="uid + '-ps'" class="pl-select" :value="pageSize" @change="setPageSize($event.target.value)">
            <option v-for="n in pageSizeChoices" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <div class="vd-pager__nav">
          <button type="button" class="vd-pager__btn" :disabled="page <= 1" aria-label="First page" @click="goPage(1)">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('chevrons-left')"></path></svg>
          </button>
          <button type="button" class="vd-pager__btn" :disabled="page <= 1" aria-label="Previous page" @click="goPage(page - 1)">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('chevron-left')"></path></svg>
          </button>

          <template v-for="(p, i) in pageButtons">
            <span v-if="p === '…'" :key="'g' + i" class="vd-pager__gap">…</span>
            <button
              v-else :key="'p' + p" type="button" class="vd-pager__num" :class="{ 'vd-pager__num--on': p === page }"
              :aria-current="p === page ? 'page' : undefined" @click="goPage(p)"
            >{{ p }}</button>
          </template>

          <button type="button" class="vd-pager__btn" :disabled="page >= totalPages" aria-label="Next page" @click="goPage(page + 1)">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('chevron-right')"></path></svg>
          </button>
          <button type="button" class="vd-pager__btn" :disabled="page >= totalPages" aria-label="Last page" @click="goPage(totalPages)">
            <svg class="vd-svg" v-bind="svgAttrs"><path :d="ic('chevrons-right')"></path></svg>
          </button>
        </div>

        <div v-if="totalPages > 5" class="pl-jump">
          <label class="pl-pagesize__label" :for="uid + '-jump'">Go to</label>
          <input
            :id="uid + '-jump'" class="pl-jump__input" type="number" min="1" :max="totalPages"
            :value="page" @keydown.enter="goPage(Number($event.target.value))" @blur="goPage(Number($event.target.value))"
          />
        </div>
      </div>
    </div>

    <!-- Keeps the last row and the pager clear of a fixed bottom nav bar. -->
    <div v-if="bottomSpace > 0" class="pl-navspace" aria-hidden="true"></div>
   </div>
  </div>
</template>

<script>
const ICONS = {
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  columns: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v18M15 3v18",
  folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  sort: "M8 9l4-4 4 4M16 15l-4 4-4-4",
  "arrow-up": "M12 19V5M5 12l7-7 7 7",
  "arrow-down": "M12 5v14M19 12l-7 7-7-7",
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-left": "M15 18l-6-6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  "chevrons-left": "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  "chevrons-right": "M13 17l5-5-5-5M6 17l5-5-5-5",
};

// Every column the section knows how to render, in default order. `field` names
// the ww-config property holding the row key(s) for that cell; `sortKey` is what
// gets emitted for a backend sort (resolved to the real column at emit time).
const ALL_COLUMNS = [
  { key: "title",    label: "Title",       field: "fieldTitle",    minw: 230, sortable: true },
  { key: "status",   label: "Status",      field: "fieldStatus",   minw: 130, sortable: true },
  { key: "address",  label: "Address",     field: "fieldAddress",  minw: 250, sortable: true },
  { key: "assigned", label: "Assigned To", field: "fieldAssigned", minw: 150, sortable: true },
  { key: "customer", label: "Customer",    field: "fieldCustomer", minw: 170, sortable: true },
  { key: "amount",   label: "Amount",      field: "fieldAmount",   minw: 110, sortable: true, num: true },
  { key: "wo",       label: "WO#",         field: "fieldWo",       minw: 130, sortable: true },
  { key: "created",  label: "Created",     field: "fieldCreated",  minw: 130, sortable: true },
  { key: "lob",      label: "LOB",         field: "fieldLob",      minw: 130, sortable: true },
  { key: "actions",  label: "",            field: null,            minw: 165, sortable: false },
];

// Filter key -> the ww-config props that configure it.
//
// Each filter matches on IDS, not on the display text: `matchField` is the row
// column holding them and `valueKey` is the normalized array they land in, while
// `labelKey` is the parallel *_name array used only for showing a human label.
// So renaming a customer or a rep never breaks a saved filter.
//
// `list: true` means the column is an array of ids (a lookup/link), matched with
// ARRAYJOIN; Status is a plain text column with no id, compared with `=`.
const FILTERS = [
  { key: "client",   show: "showClientFilter",   label: "clientLabel",   dflt: "Client",      options: "clientOptions",   optLabel: "clientOptionLabel",   optValue: "clientOptionValue",   matchField: "fieldCustomerId", valueKey: "customerIds", labelKey: "customerList", list: true },
  { key: "status",   show: "showStatusFilter",   label: "statusLabel",   dflt: "Status",      options: "statusOptions",   optLabel: "statusOptionLabel",   optValue: "statusOptionValue",   matchField: "fieldStatus",     valueKey: "statusList",  labelKey: "statusList",   list: false },
  { key: "lob",      show: "showLobFilter",      label: "lobLabel",      dflt: "LOB",         options: "lobOptions",      optLabel: "lobOptionLabel",      optValue: "lobOptionValue",      matchField: "fieldLobId",      valueKey: "lobIds",      labelKey: "lobList",      list: true },
  { key: "assigned", show: "showAssignedFilter", label: "assignedLabel", dflt: "Assigned To", options: "assignedOptions", optLabel: "assignedOptionLabel", optValue: "assignedOptionValue", matchField: "fieldAssignedId", valueKey: "assignedIds", labelKey: "assignedList", list: true },
];

// Airtable string literals escape a double quote with a backslash.
const q = (v) => '"' + String(v == null ? "" : v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
// A field reference. Airtable allows spaces and # inside braces; a literal brace
// in a field name would break the formula, so strip those.
const f = (name) => "{" + String(name || "").replace(/[{}]/g, "") + "}";
// UTF-8 byte-order mark — Excel needs it to read the CSV as UTF-8.
const BOM = "﻿";

export default {
  // Declare every prop WeWeb injects so none fall through as attributes onto the
  // root element (stray fallthrough attrs can interfere with the editor overlay).
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: false },
    wwFrontState: { type: Object, required: false },
    wwElementState: { type: Object, required: false },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false },
    /* wwEditor:end */
  },
  inheritAttrs: false,
  emits: ["trigger-event"],

  // Expose the live query as a component variable, so a dynamic collection can
  // read `query.filterByFormula` / `query.limit` / `query.offset` straight from
  // its own bindings — no workflow needed. Older runtimes without component
  // variables just fall back to the `queryChange` event.
  setup(props) {
    let queryVar = null;
    try {
      if (typeof wwLib !== "undefined" && wwLib && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
        queryVar = wwLib.wwVariable.useComponentVariable({
          uid: props.uid,
          name: "query",
          type: "object",
          defaultValue: {},
        });
      }
    } catch (e) { /* not running inside WeWeb — harness / SSR */ }
    return { queryVar };
  },

  data() {
    return {
      search: "",
      // Multi-select filter state, one array per FILTERS key.
      sel: { client: [], status: [], lob: [], assigned: [] },
      createdFrom: "",
      createdTo: "",
      // Kept as raw input strings; "" means that end of the range is open.
      amountMin: "",
      amountMax: "",
      sortField: this.content.sortField || "created",
      sortDirection: this.content.sortDirection || "desc",
      page: 1,
      localPageSize: null,
      view: this.content.view || "table",
      openDd: null,
      ddQuery: "",
      // null = follow the `visibleColumns` prop; an array = the user's picker choice.
      colOverride: null,
      searchTimer: null,
      pushTimer: null,
      copied: false,
      ALL_COLUMNS,
    };
  },

  watch: {
    "content.sortField"(v) { if (v) { this.sortField = v; this.queueQuery("sort"); } },
    "content.sortDirection"(v) { if (v) { this.sortDirection = v; this.queueQuery("sort"); } },
    "content.view"(v) { if (v) this.view = v; },
    "content.pageSize"() { this.page = 1; this.localPageSize = null; this.queueQuery("pageSize"); },
    "content.visibleColumns"() { this.colOverride = null; },
    // Search is debounced on its own timer — one keystroke shouldn't be one fetch.
    search() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      const ms = Number(this.content.searchDebounce);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.fireEvent("searchChange", { search: this.search.trim() });
        this.pushQuery("search");
      }, isNaN(ms) || ms < 0 ? 350 : ms);
    },
    createdFrom() { this.page = 1; this.queueQuery("filter"); },
    createdTo() { this.page = 1; this.queueQuery("filter"); },
    // v-model.lazy on the inputs, so these fire on commit rather than per keystroke.
    amountMin() { this.page = 1; this.queueQuery("filter"); },
    amountMax() { this.page = 1; this.queueQuery("filter"); },
    openDd() { this.ddQuery = ""; },
    // Clamp the page if the total shrinks under us (a filter narrowed the set).
    totalPages(tp) { if (this.page > tp) this.goPage(tp); },
  },

  mounted() {
    const w = this.win();
    if (w) {
      w.addEventListener("click", this.onDocClick);
      w.addEventListener("keydown", this.onKeydown);
    }
    // Publish the opening query so the collection has something to fetch with.
    this.pushQuery("init", this.content.fetchOnMount === false);
  },
  beforeUnmount() {
    const w = this.win();
    if (w) {
      w.removeEventListener("click", this.onDocClick);
      w.removeEventListener("keydown", this.onKeydown);
    }
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.pushTimer) clearTimeout(this.pushTimer);
  },

  computed: {
    // ---- mode ----
    serverMode() { return this.content.serverMode !== false; },
    rowClickable() { return this.content.rowClickOpens !== false; },

    // ---- raw + normalized rows ----
    rawRows() { return this.asArray(this.content.rows); },
    normalized() {
      return this.rawRows.map((raw, i) => {
        const lob = this.listVal(raw, this.fieldKeys("fieldLob"));
        return {
          _i: i, _raw: raw,
          id: String(this.rowVal(raw, this.fieldKeys("fieldId")) || ""),
          title: this.text(this.rowVal(raw, this.fieldKeys("fieldTitle"))),
          status: this.text(this.rowVal(raw, this.fieldKeys("fieldStatus"))),
          address: this.text(this.rowVal(raw, this.fieldKeys("fieldAddress"))),
          assigned: this.listVal(raw, this.fieldKeys("fieldAssigned")).join(", "),
          customer: this.listVal(raw, this.fieldKeys("fieldCustomer")).join(", "),
          amount: this.num(this.rowVal(raw, this.fieldKeys("fieldAmount"))),
          wo: this.text(this.rowVal(raw, this.fieldKeys("fieldWo"))),
          created: this.rowVal(raw, this.fieldKeys("fieldCreated")),
          lob,
          // Display names, kept as arrays so a filter option can be labelled.
          statusList: this.listVal(raw, this.fieldKeys("fieldStatus")),
          customerList: this.listVal(raw, this.fieldKeys("fieldCustomer")),
          assignedList: this.listVal(raw, this.fieldKeys("fieldAssigned")),
          lobList: lob,
          // The ids the filters actually match on. Airtable returns a lookup and
          // its parallel name lookup in the same order, so index i of each pair
          // describes the same linked record.
          customerIds: this.listVal(raw, this.fieldKeys("fieldCustomerId")),
          assignedIds: this.listVal(raw, this.fieldKeys("fieldAssignedId")),
          lobIds: this.listVal(raw, this.fieldKeys("fieldLobId")),
        };
      });
    },

    // ---- client-mode filtering / sorting (no-ops in server mode) ----
    clientFiltered() {
      if (this.serverMode) return this.normalized;
      const term = this.search.trim().toLowerCase();
      const from = this.createdFrom ? this.parseDate(this.createdFrom) : null;
      const to = this.createdTo ? this.parseDate(this.createdTo) : null;
      return this.normalized.filter((r) => {
        if (term) {
          const hay = [r.title, r.status, r.address, r.assigned, r.customer, r.wo, r.lob.join(" ")].join(" ").toLowerCase();
          if (!term.split(/\s+/).every((w) => hay.indexOf(w) !== -1)) return false;
        }
        for (const def of FILTERS) {
          const picked = this.sel[def.key];
          if (!picked.length) continue;
          const have = r[def.valueKey] || [];
          if (!picked.some((v) => have.indexOf(v) !== -1)) return false;
        }
        if (this.amountActive) {
          // A row with no amount can't satisfy a range, so it drops out.
          if (r.amount == null) return false;
          if (this.amountMinNum != null && r.amount < this.amountMinNum) return false;
          if (this.amountMaxNum != null && r.amount > this.amountMaxNum) return false;
        }
        if (from || to) {
          const d = this.parseDate(r.created);
          if (!d) return false;
          if (from && d < from) return false;
          // `to` is inclusive of the whole day.
          if (to && d > new Date(to.getTime() + 86399999)) return false;
        }
        return true;
      });
    },
    clientSorted() {
      if (this.serverMode) return this.clientFiltered;
      const dir = this.sortDirection === "asc" ? 1 : -1;
      const key = this.sortField;
      const val = (r) => {
        if (key === "created") { const d = this.parseDate(r.created); return d ? d.getTime() : null; }
        if (key === "amount") return r.amount == null || r.amount === "" ? null : Number(r.amount);
        return String(r[key] == null ? "" : r[key]).toLowerCase();
      };
      return this.clientFiltered.slice().sort((a, b) => {
        const x = val(a), y = val(b);
        // Empty cells always sink, whichever way the column is pointing.
        if (x == null || x === "") return y == null || y === "" ? 0 : 1;
        if (y == null || y === "") return -1;
        if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
        return String(x).localeCompare(String(y), undefined, { sensitivity: "base", numeric: true }) * dir;
      });
    },

    // ---- pagination ----
    pageSize() {
      const n = Number(this.localPageSize != null ? this.localPageSize : this.content.pageSize);
      return n > 0 ? Math.floor(n) : 25;
    },
    pageSizeChoices() {
      const raw = String(this.content.pageSizeOptions || "25,50,100,200");
      const list = raw.split(",").map((s) => parseInt(s, 10)).filter((n) => n > 0);
      if (list.indexOf(this.pageSize) === -1) list.push(this.pageSize);
      return list.sort((a, b) => a - b);
    },
    total() {
      if (!this.serverMode) return this.clientSorted.length;
      const t = Number(this.content.totalCount);
      if (!isNaN(t) && this.content.totalCount != null && this.content.totalCount !== "") return t;
      // totalCount unbound — fall back to the collection object's own total, then
      // to the row count (which makes the pager a single page).
      const raw = this.content.rows;
      if (raw && !Array.isArray(raw) && typeof raw === "object" && Number(raw.total) >= 0) return Number(raw.total);
      return this.rawRows.length;
    },
    totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
    offset() { return (this.page - 1) * this.pageSize; },
    displayRows() {
      if (!this.serverMode) return this.clientSorted.slice(this.offset, this.offset + this.pageSize);
      // Server mode: the bound rows ARE the page. The slice is only a safety net
      // for a collection that was left on auto-fetch-everything — without it the
      // section would dump all 3,000+ rows into the DOM.
      if (this.normalized.length > this.pageSize) return this.normalized.slice(this.offset, this.offset + this.pageSize);
      return this.normalized;
    },
    rangeText() {
      if (!this.displayRows.length) return "0";
      const start = this.offset + 1;
      return this.nf(start) + "–" + this.nf(this.offset + this.displayRows.length);
    },
    pageAmount() { return this.displayRows.reduce((t, r) => t + (Number(r.amount) || 0), 0); },
    // First / last / a window around the current page, with ellipses between.
    pageButtons() {
      const tp = this.totalPages, p = this.page, out = [];
      if (tp <= 7) { for (let i = 1; i <= tp; i++) out.push(i); return out; }
      const push = (n) => { if (out[out.length - 1] !== n) out.push(n); };
      push(1);
      if (p > 3) out.push("…");
      for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) push(i);
      if (p < tp - 2) out.push("…");
      push(tp);
      return out;
    },

    // ---- columns ----
    activeColumnKeys() {
      if (this.colOverride) return this.colOverride;
      const raw = String(this.content.visibleColumns || "");
      const keys = raw.split(",").map((s) => s.trim()).filter(Boolean).filter((k) => ALL_COLUMNS.some((c) => c.key === k));
      return keys.length ? keys : ALL_COLUMNS.map((c) => c.key);
    },
    columns() {
      return this.activeColumnKeys
        .map((k) => ALL_COLUMNS.find((c) => c.key === k))
        .filter(Boolean)
        .filter((c) => c.key !== "actions" || this.hasRowActions);
    },

    // ---- filters ----
    filterDefs() {
      return FILTERS.filter((d) => this.content[d.show] !== false).map((d) => {
        const bound = this.asArray(this.content[d.options]);
        return {
          key: d.key,
          label: this.content[d.label] || d.dflt,
          optionsBound: bound.length > 0,
          options: bound.length ? this.normalizeOptions(bound, this.content[d.optLabel], this.content[d.optValue]) : this.derivedOptions(d),
          selected: this.sel[d.key] || [],
        };
      });
    },
    activeFilterCount() {
      let n = 0;
      for (const d of FILTERS) n += (this.sel[d.key] || []).length;
      if (this.search.trim()) n += 1;
      if (this.createdFrom) n += 1;
      if (this.createdTo) n += 1;
      if (this.amountMinNum != null) n += 1;
      if (this.amountMaxNum != null) n += 1;
      return n;
    },

    // ---- amount range ----
    amountMinNum() { const n = Number(this.amountMin); return this.amountMin === "" || this.amountMin == null || isNaN(n) ? null : n; },
    amountMaxNum() { const n = Number(this.amountMax); return this.amountMax === "" || this.amountMax == null || isNaN(n) ? null : n; },
    amountActive() { return this.amountMinNum != null || this.amountMaxNum != null; },
    // A backwards range returns nothing; say so rather than showing a silent zero.
    amountInvalid() { return this.amountMinNum != null && this.amountMaxNum != null && this.amountMinNum > this.amountMaxNum; },
    amountSummary() { return this.rangeLabel(this.amountMinNum, this.amountMaxNum); },
    amountPresets() {
      const raw = String(this.content.amountPresets == null ? "-1000,1000-5000,5000-25000,25000-" : this.content.amountPresets);
      const out = [];
      for (const chunk of raw.split(",")) {
        const part = chunk.trim();
        if (!part) continue;
        const bits = part.split("-");
        if (bits.length !== 2) continue;
        const min = bits[0].trim() === "" ? null : Number(bits[0]);
        const max = bits[1].trim() === "" ? null : Number(bits[1]);
        if ((min == null && max == null) || (min != null && isNaN(min)) || (max != null && isNaN(max))) continue;
        out.push({ min, max, label: this.rangeLabel(min, max) });
      }
      return out;
    },
    activeChips() {
      const out = [];
      for (const def of this.filterDefs) {
        for (const v of def.selected) out.push({ key: def.key, group: def.label, value: v, label: this.labelFor(def, v) });
      }
      if (this.amountActive) out.push({ key: "__amount", group: this.content.amountLabel || "Amount", value: "", label: this.amountSummary });
      if (this.createdFrom) out.push({ key: "__from", group: "From", value: this.createdFrom, label: this.fmtDate(this.createdFrom) });
      if (this.createdTo) out.push({ key: "__to", group: "To", value: this.createdTo, label: this.fmtDate(this.createdTo) });
      return out;
    },
    newTabTitle() { return this.content.newTabLabel || "Open in new tab"; },
    showViewDetails() { return this.content.showViewDetails !== false; },
    showNewTab() { return this.content.showOpenNewTab !== false; },
    // With both buttons off the Actions column has nothing to draw — drop it
    // rather than leaving an empty pinned column taking up width.
    hasRowActions() { return this.showViewDetails || this.showNewTab; },
    // An unbound totalCount collapses the pager to one page — worth calling out.
    totalBound() { return this.content.totalCount != null && this.content.totalCount !== ""; },

    // ---- the query object shared by the event and the component variable ----
    queryPayload() {
      const filters = {
        search: this.search.trim(),
        client: this.sel.client.slice(),
        status: this.sel.status.slice(),
        lob: this.sel.lob.slice(),
        assigned: this.sel.assigned.slice(),
        // Numbers when set, null when that end of the range is open.
        amountMin: this.amountMinNum,
        amountMax: this.amountMaxNum,
        createdFrom: this.createdFrom,
        createdTo: this.createdTo,
      };
      const sortColumn = this.airtableSortField;
      return {
        page: this.page,
        pageSize: this.pageSize,
        limit: this.pageSize,
        offset: this.offset,
        search: filters.search,
        filters,
        sortField: sortColumn,
        sortDirection: this.sortDirection,
        sort: sortColumn ? [{ field: sortColumn, direction: this.sortDirection }] : [],
        filterByFormula: this.filterByFormula,
      };
    },
    airtableSortField() {
      const col = ALL_COLUMNS.find((c) => c.key === this.sortField);
      if (!col || !col.field) return "";
      // The first mapped key is the real Airtable column name.
      return this.fieldKeys(col.field)[0] || "";
    },
    // A complete Airtable filterByFormula for the current search + filters.
    filterByFormula() {
      const clauses = [];

      const term = this.search.trim();
      if (term) {
        const target = this.fieldKeys("fieldSearch")[0];
        // Every word must appear somewhere in the concatenated search column.
        const words = term.split(/\s+/).filter(Boolean).map((w) => `FIND(${q(w.toLowerCase())}, LOWER(${f(target)}))`);
        clauses.push(words.length === 1 ? words[0] : `AND(${words.join(", ")})`);
      }

      for (const def of FILTERS) {
        const picked = this.sel[def.key] || [];
        if (!picked.length) continue;
        const column = this.fieldKeys(def.matchField)[0];
        const parts = picked.map((v) =>
          def.list
            // Id lookups arrive as arrays. Join with a delimiter and search for the
            // delimited id, so one id can never match another that starts with it.
            // The needle is one literal rather than a concatenation — same result,
            // less for a formula parser to trip on.
            ? `FIND(${q("|" + v + "|")}, "|" & ARRAYJOIN(${f(column)}, "|") & "|")`
            : `${f(column)} = ${q(v)}`
        );
        clauses.push(parts.length === 1 ? parts[0] : `OR(${parts.join(", ")})`);
      }

      const amountCol = this.fieldKeys("fieldAmount")[0];
      // Numeric literals, so they must not be quoted like the text filters are.
      if (this.amountMinNum != null) clauses.push(`${f(amountCol)} >= ${this.amountMinNum}`);
      if (this.amountMaxNum != null) clauses.push(`${f(amountCol)} <= ${this.amountMaxNum}`);

      const dateCol = this.fieldKeys("fieldCreated")[0];
      if (this.createdFrom) clauses.push(`NOT(IS_BEFORE(${f(dateCol)}, DATETIME_PARSE(${q(this.createdFrom)}, "YYYY-MM-DD")))`);
      // Inclusive of the whole end day: strictly before the following midnight.
      if (this.createdTo) clauses.push(`IS_BEFORE(${f(dateCol)}, DATEADD(DATETIME_PARSE(${q(this.createdTo)}, "YYYY-MM-DD"), 1, "days"))`);

      if (!clauses.length) return "";
      return clauses.length === 1 ? clauses[0] : `AND(${clauses.join(", ")})`;
    },

    // ---- editor detection ----
    isEditing() {
      /* wwEditor:start */
      const s = this.wwEditorState;
      return !!(s && (s.isEditing || s.editMode === "EDITION" || s.editMode === true));
      /* wwEditor:end */
      // eslint-disable-next-line no-unreachable
      return false;
    },

    // ---- theming ----
    svgAttrs() { return { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }; },
    themeClass() {
      const m = this.content.darkMode || "auto";
      return { "vd-auto": m === "auto", "vd-dark": m === "dark", "vd-light": m === "light" };
    },
    densityClass() { return this.content.density === "comfortable" ? "pl-roomy" : "pl-tight"; },
    bottomSpace() { const n = Number(this.content.bottomSpace); return isNaN(n) ? 96 : n; },
    rootStyle() {
      return {
        "--vd-primary": this.content.primaryColor || "#10b981",
        "--vd-accent": this.content.accentColor || "#2563eb",
        "--vd-radius": (this.content.radius != null ? this.content.radius : 14) + "px",
        "--pl-bottom": (this.content.bottomSpace != null ? this.content.bottomSpace : 96) + "px",
      };
    },
  },

  methods: {
    ic(name) { return ICONS[name] || ""; },

    // ---- host window / document ----
    // WeWeb renders the app inside an iframe in the editor, so the component's
    // own `window` / `document` are not necessarily the ones the page lives in.
    // wwLib hands back the right pair; the fallback covers the dev harness.
    win() {
      try { if (typeof wwLib !== "undefined" && wwLib && wwLib.getFrontWindow) return wwLib.getFrontWindow(); } catch (e) { /* not in WeWeb */ }
      return typeof window !== "undefined" ? window : null;
    },
    doc() {
      try { if (typeof wwLib !== "undefined" && wwLib && wwLib.getFrontDocument) return wwLib.getFrontDocument(); } catch (e) { /* not in WeWeb */ }
      return typeof document !== "undefined" ? document : null;
    },

    // ---- generic data helpers ----
    asArray(raw) {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
      }
      return [];
    },
    // Comma-separated field-name lists, so the section adapts to a differently
    // named collection without a code change. First key present on the row wins.
    fieldKeys(prop) {
      const raw = this.content[prop];
      if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
      const list = String(raw == null ? "" : raw).split(",").map((s) => s.trim()).filter(Boolean);
      return list.length ? list : [prop];
    },
    rowVal(row, keys) {
      if (!row || typeof row !== "object") return "";
      for (const k of keys) if (row[k] != null && row[k] !== "") return row[k];
      return "";
    },
    // Lookup / linked-record columns come back as arrays; scalars come back bare.
    listVal(row, keys) {
      const v = this.rowVal(row, keys);
      if (Array.isArray(v)) return v.map((x) => this.text(x)).filter((s) => s !== "");
      const s = this.text(v);
      return s === "" ? [] : [s];
    },
    text(v) {
      if (v == null) return "";
      if (Array.isArray(v)) return v.map((x) => this.text(x)).filter(Boolean).join(", ");
      if (typeof v === "object") return String(v.name || v.label || v.title || v.value || v.id || "");
      return String(v);
    },
    num(v) {
      if (v == null || v === "") return null;
      const n = Number(Array.isArray(v) ? v[0] : v);
      return isNaN(n) ? null : n;
    },
    nf(n) { const x = Number(n); return isNaN(x) ? "0" : x.toLocaleString("en-US"); },
    money(n) {
      const x = Number(n);
      if (isNaN(x)) return "—";
      try {
        return x.toLocaleString("en-US", { style: "currency", currency: this.content.currency || "USD", maximumFractionDigits: x % 1 ? 2 : 0 });
      } catch (e) {
        // Bad currency code — fall back to a plain number rather than throwing.
        return this.nf(Math.round(x));
      }
    },
    // Parse date-only strings (YYYY-MM-DD) as LOCAL midnight so they don't shift a
    // day in timezones behind UTC; everything else through the native parser.
    parseDate(raw) {
      if (raw instanceof Date) return raw;
      if (Array.isArray(raw)) raw = raw[0];
      if (raw == null || raw === "") return null;
      const s = String(raw);
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      const d = new Date(s);
      return isNaN(d) ? null : d;
    },
    fmtDate(raw) {
      const d = this.parseDate(raw);
      if (!d) return "—";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    },
    statusTone(status) {
      const s = String(status || "").toLowerCase();
      if (s.indexOf("complet") === 0) return "success";
      if (s.indexOf("cancel") === 0) return "slate";
      if (s.indexOf("progress") !== -1 || s === "active" || s === "in progress") return "info";
      if (s.indexOf("hold") !== -1 || s.indexOf("pending") !== -1) return "warning";
      if (s.indexOf("schedul") === 0) return "violet";
      if (s.indexOf("lead") === 0 || s.indexOf("estimate") === 0) return "teal";
      return "slate";
    },
    has(key) { return this.activeColumnKeys.indexOf(key) !== -1; },

    // ---- filter option plumbing ----
    // A bound options list can be an array of strings, or of rows — in which case
    // the label/value field props say which columns to read.
    normalizeOptions(list, labelField, valueField) {
      const lk = String(labelField || "name").split(",").map((s) => s.trim()).filter(Boolean);
      const vk = String(valueField || "name").split(",").map((s) => s.trim()).filter(Boolean);
      const seen = {}, out = [];
      for (const item of list) {
        let value, label;
        if (item && typeof item === "object") {
          value = this.text(this.rowVal(item, vk.length ? vk : ["name"]));
          label = this.text(this.rowVal(item, lk.length ? lk : ["name"])) || value;
        } else {
          value = this.text(item); label = value;
        }
        if (value === "" || seen[value]) continue;
        seen[value] = 1;
        out.push({ value, label });
      }
      return out;
    },
    // Fallback when a filter has no list bound: distinct ids off the loaded rows,
    // labelled from the parallel name column. In server mode that's only the
    // current page — bind a list instead.
    derivedOptions(def) {
      const seen = {}, out = [];
      for (const r of this.normalized) {
        const values = r[def.valueKey] || [];
        const labels = r[def.labelKey] || [];
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          if (v === "" || seen[v]) continue;
          seen[v] = 1;
          // Same index = same linked record. If the two lookups don't line up,
          // showing the raw id beats showing the wrong name.
          out.push({ value: v, label: values.length === labels.length && labels[i] ? labels[i] : v });
        }
      }
      return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    },
    ddOptions(def) {
      const term = this.ddQuery.trim().toLowerCase();
      // Anything already picked stays visible even if it isn't in the list, so it
      // can always be unpicked.
      const opts = def.options.slice();
      for (const v of def.selected) if (!opts.some((o) => o.value === v)) opts.unshift({ value: v, label: v });
      if (!term) return opts;
      return opts.filter((o) => o.label.toLowerCase().indexOf(term) !== -1);
    },
    labelFor(def, value) {
      const hit = def.options.find((o) => o.value === value);
      return hit ? hit.label : value;
    },
    toggleDd(key) {
      this.openDd = this.openDd === key ? null : key;
      // Only the multi-select menus have a search box to focus.
      if (this.openDd && FILTERS.some((d) => d.key === this.openDd)) {
        this.$nextTick(() => {
          const el = this.$refs.ddSearch;
          const input = Array.isArray(el) ? el[0] : el;
          if (input && input.focus) input.focus();
        });
      }
    },
    toggleFilterValue(key, value) {
      const cur = (this.sel[key] || []).slice();
      const at = cur.indexOf(value);
      if (at === -1) cur.push(value); else cur.splice(at, 1);
      this.sel = { ...this.sel, [key]: cur };
      this.page = 1;
      this.fireEvent("filterChange", { key, values: cur, filters: this.queryPayload.filters });
      this.queueQuery("filter");
    },
    clearFilter(key) {
      if (!(this.sel[key] || []).length) return;
      this.sel = { ...this.sel, [key]: [] };
      this.page = 1;
      this.fireEvent("filterChange", { key, values: [], filters: this.queryPayload.filters });
      this.queueQuery("filter");
    },
    removeChip(chip) {
      if (chip.key === "__from") { this.createdFrom = ""; return; }
      if (chip.key === "__to") { this.createdTo = ""; return; }
      if (chip.key === "__amount") { this.clearAmount(); return; }
      this.toggleFilterValue(chip.key, chip.value);
    },
    clearAll() {
      this.search = "";
      this.sel = { client: [], status: [], lob: [], assigned: [] };
      this.createdFrom = "";
      this.createdTo = "";
      this.amountMin = "";
      this.amountMax = "";
      this.page = 1;
      this.queueQuery("filter");
    },

    // ---- amount range ----
    // "Under $1,000" / "$1,000–$5,000" / "$25,000+" from whichever ends are set.
    rangeLabel(min, max) {
      if (min == null && max == null) return "";
      if (min == null) return "Under " + this.money(max);
      if (max == null) return this.money(min) + "+";
      return this.money(min) + "–" + this.money(max);
    },
    presetOn(p) {
      return (p.min == null ? this.amountMinNum == null : this.amountMinNum === p.min)
        && (p.max == null ? this.amountMaxNum == null : this.amountMaxNum === p.max);
    },
    applyAmountPreset(p) {
      // Clicking the active preset turns it off again.
      if (this.presetOn(p)) { this.clearAmount(); return; }
      this.amountMin = p.min == null ? "" : String(p.min);
      this.amountMax = p.max == null ? "" : String(p.max);
    },
    clearAmount() {
      if (!this.amountActive) return;
      this.amountMin = "";
      this.amountMax = "";
    },

    // ---- columns ----
    toggleColumn(key) {
      const cur = this.activeColumnKeys.slice();
      const at = cur.indexOf(key);
      if (at === -1) {
        // Re-insert in the canonical order rather than at the end.
        const order = ALL_COLUMNS.map((c) => c.key);
        cur.push(key);
        cur.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      } else if (cur.length > 1) {
        cur.splice(at, 1);
      }
      this.colOverride = cur;
    },
    resetColumns() { this.colOverride = null; },

    // ---- sort / paging ----
    toggleSort(key) {
      const col = ALL_COLUMNS.find((c) => c.key === key);
      if (!col || !col.sortable) return;
      if (this.sortField === key) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortField = key;
        // Dates and money read most usefully largest-first; text A→Z.
        this.sortDirection = key === "created" || key === "amount" ? "desc" : "asc";
      }
      this.page = 1;
      this.fireEvent("sortChange", { field: this.airtableSortField, direction: this.sortDirection });
      this.queueQuery("sort");
    },
    goPage(p) {
      const next = Math.max(1, Math.min(this.totalPages, Number(p) || 1));
      if (next === this.page) return;
      this.page = next;
      this.fireEvent("pageChange", { page: next, pageSize: this.pageSize, offset: this.offset, limit: this.pageSize });
      this.pushQuery("page");
      this.scrollToTop();
    },
    setPageSize(v) {
      const n = parseInt(v, 10);
      if (!(n > 0) || n === this.pageSize) return;
      this.localPageSize = n;
      this.page = 1;
      this.pushQuery("pageSize");
    },
    scrollToTop() {
      const el = this.$el;
      if (!el || typeof el.getBoundingClientRect !== "function") return;
      // Only pull the viewport back up if the top of the section has scrolled off.
      if (el.getBoundingClientRect().top < 0 && this.win()) {
        try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); }
      }
    },
    refresh() {
      this.fireEvent("refresh", {});
      this.pushQuery("refresh");
    },

    // ---- events + the component variable ----
    fireEvent(name, event) {
      if (this.isEditing) return;
      this.$emit("trigger-event", { name, event: event || {} });
    },
    // Coalesce several state changes in the same tick into one query push, so
    // picking two filter values doesn't fire two fetches.
    queueQuery(reason) {
      if (this.pushTimer) clearTimeout(this.pushTimer);
      this.pushTimer = setTimeout(() => this.pushQuery(reason), 0);
    },
    pushQuery(reason, silent) {
      if (this.pushTimer) { clearTimeout(this.pushTimer); this.pushTimer = null; }
      const query = { ...this.queryPayload, reason: reason || "change" };
      // The component variable updates even in the editor, so bindings preview live.
      if (this.queryVar && typeof this.queryVar.setValue === "function") {
        try { this.queryVar.setValue(query); } catch (e) { /* runtime rejected it — event still fires */ }
      }
      if (!silent) this.fireEvent("queryChange", { query });
    },
    openProject(r) {
      this.fireEvent("projectClick", { index: r._i, id: r.id || "", item: r._raw || {} });
    },
    // Fill {placeholders} from the row: the normalized cell first (id, title, wo,
    // status…), then the raw collection column, so {Stacker Display} works too.
    resolveUrl(r) {
      const tpl = String(this.content.newTabUrl || "").trim();
      if (!tpl) return "";
      return tpl.replace(/\{([^{}]+)\}/g, (m, key) => {
        const k = key.trim();
        let v = r[k];
        if (v == null || v === "" || k.charAt(0) === "_") v = r._raw ? r._raw[k] : "";
        return encodeURIComponent(this.text(Array.isArray(v) ? v[0] : v));
      });
    },
    openNewTab(r) {
      const url = this.resolveUrl(r);
      // open() has to run synchronously inside the click or the popup blocker
      // swallows it — so no awaiting the event round-trip first. It must also be
      // the FRONT window: opening from the editor's window would resolve a
      // relative URL against the editor rather than the app.
      const w = this.win();
      if (url && w && w.open) {
        try { w.open(url, "_blank", "noopener,noreferrer"); } catch (e) { /* blocked — the event still fires */ }
      }
      this.fireEvent("openNewTab", { index: r._i, id: r.id || "", item: r._raw || {}, url });
    },

    // Puts the live formula on the clipboard so it can be pasted straight into
    // Airtable's own filter box to see whether IT returns rows.
    copyFormula() {
      const text = this.filterByFormula || "";
      const w = this.win(), d = this.doc();
      const done = () => { this.copied = true; setTimeout(() => { this.copied = false; }, 1500); };
      if (w && w.navigator && w.navigator.clipboard) {
        w.navigator.clipboard.writeText(text).then(done, () => this.copyFallback(d, text, done));
        return;
      }
      this.copyFallback(d, text, done);
    },
    copyFallback(d, text, done) {
      if (!d) return;
      try {
        const ta = d.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        d.body.appendChild(ta);
        ta.select();
        d.execCommand("copy");
        d.body.removeChild(ta);
        done();
      } catch (e) { /* clipboard unavailable — the text is on screen anyway */ }
    },

    // ---- global listeners ----
    onDocClick() { if (this.openDd) this.openDd = null; },
    onKeydown(e) { if (e.key === "Escape" && this.openDd) this.openDd = null; },

    // ---- CSV ----
    // Exports the rows currently on screen. In server mode that is this page only
    // — raise "Rows per page" first if you need more in one file.
    exportCsv() {
      const cols = this.columns.filter((c) => c.key !== "actions");
      const columns = cols.map((c) => ({
        header: c.label,
        get: (r) => {
          if (c.key === "created") return this.csvDate(r.created);
          if (c.key === "lob") return r.lob.join("; ");
          if (c.key === "amount") return r.amount == null ? "" : r.amount;
          return r[c.key];
        },
      }));
      this.downloadCsv("projects.csv", columns, this.displayRows);
      this.fireEvent("exportCsv", { count: this.displayRows.length });
    },
    // ISO date for CSV so spreadsheets sort/parse it correctly.
    csvDate(raw) {
      const d = this.parseDate(raw);
      if (!d) return "";
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    downloadCsv(filename, columns, rows) {
      const esc = (val) => { let s = val == null ? "" : String(val); if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'; return s; };
      const head = columns.map((c) => esc(c.header)).join(",");
      const body = rows.map((r) => columns.map((c) => esc(c.get(r))).join(",")).join("\r\n");
      const csv = BOM + head + "\r\n" + body;
      const w = this.win(), d = this.doc();
      if (!w || !d) return;
      try {
        // Blob/URL must come from the front window, or the object URL belongs to
        // a different origin than the anchor that is about to use it.
        const blob = new w.Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = w.URL.createObjectURL(blob);
        const a = d.createElement("a");
        a.href = url; a.download = filename;
        d.body.appendChild(a); a.click(); d.body.removeChild(a);
        setTimeout(() => { try { w.URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      } catch (e) { /* download blocked (e.g. sandboxed editor) — no-op */ }
    },
  },
};
</script>

<style scoped>
.vd-root {
  --surface: #ffffff; --surface-2: #f7f9fc; --surface-3: #eef2f7; --border: #e4e9f0; --border-strong: #d4dbe6;
  --text: #1f2a37; --text-muted: #64748b; --text-subtle: #94a3b8;
  --shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-pop: 0 12px 32px rgba(16, 24, 40, 0.16);
  --success: #10b981; --warning: #f59e0b; --danger: #ef4444; --info: #3b82f6; --violet: #8b5cf6; --teal: #14b8a6;
  --primary: var(--vd-primary, #10b981); --accent: var(--vd-accent, #2563eb); --radius: var(--vd-radius, 14px);
  --row-y: 10px;
  box-sizing: border-box; width: 100%; max-width: 100%; container-type: inline-size; color: var(--text);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.45;
  display: block;
}
.vd-root *, .vd-root *::before, .vd-root *::after { box-sizing: border-box; }
.vd-inner { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
/* Clearance for a fixed bottom nav bar, plus the phone's home-indicator inset. */
.pl-navspace { flex: none; height: calc(var(--pl-bottom, 96px) + env(safe-area-inset-bottom, 0px)); }
.pl-roomy { --row-y: 15px; }
/* Plain CSS on purpose — no SCSS anywhere in this file, so the WeWeb CLI never
   loads sass-loader and its Dart Sass legacy-API deprecation warning (a red
   "Compiled with problems" overlay in dev mode) never fires. The dark palette is
   duplicated rather than mixed in; keep the two blocks in sync. */
.vd-root.vd-dark {
  --surface: #161f30; --surface-2: #1b2638; --surface-3: #202c40; --border: #28344a; --border-strong: #34425c;
  --text: #e8eef7; --text-muted: #94a3b8; --text-subtle: #64748b;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.35);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-pop: 0 16px 40px rgba(0, 0, 0, 0.5);
}
@media (prefers-color-scheme: dark) {
  .vd-root.vd-auto {
    --surface: #161f30; --surface-2: #1b2638; --surface-3: #202c40; --border: #28344a; --border-strong: #34425c;
    --text: #e8eef7; --text-muted: #94a3b8; --text-subtle: #64748b;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.35);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-pop: 0 16px 40px rgba(0, 0, 0, 0.5);
  }
}

.vd-svg { display: block; }
.vd-muted { color: var(--text-muted); }

/* ---- cards ---- */
.vd-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: clamp(14px, 2vw, 20px); min-width: 0; }
.vd-card__sub { margin: 5px 0 0; color: var(--text-muted); font-size: 13px; }
.pl-total { color: var(--text); font-weight: 700; }

/* ---- header ---- */
.vd-header { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: clamp(16px, 2.4vw, 22px); }
.vd-header__name { margin: 0; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text); }
.pl-headrow { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pl-headmeta { min-width: 0; }
.pl-headactions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ---- summary tiles ---- */
.pl-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 18px; }
.pl-stat { border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; background: var(--surface-2); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pl-stat__label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-subtle); font-weight: 700; display: flex; align-items: center; gap: 7px; }
.pl-stat__label .vd-svg { width: 15px; height: 15px; flex: none; }
.pl-stat__value { font-size: 24px; font-weight: 800; color: var(--text); line-height: 1; }
.pl-stat__sub { font-size: 12px; color: var(--text-muted); }
.pl-stat--info .pl-stat__value { color: var(--info); }
.pl-stat--success .pl-stat__value { color: var(--success); }

/* ---- buttons ---- */
.vd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; transition: filter .15s, background .15s, color .15s, border-color .15s; }
.vd-btn .vd-svg { width: 15px; height: 15px; }
.vd-btn:hover:not(:disabled) { background: var(--surface-2); border-color: var(--border-strong); }
.vd-btn:disabled { opacity: .5; cursor: not-allowed; }
.vd-btn--primary { background: var(--primary); color: #fff; border-color: transparent; box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 30%, transparent); }
.vd-btn--primary:hover:not(:disabled) { filter: brightness(1.06); background: var(--primary); }
.pl-spin { animation: pl-rot 1s linear infinite; }
@keyframes pl-rot { to { transform: rotate(360deg); } }

/* ---- toolbar ---- */
.pl-toolbar { display: flex; flex-direction: column; gap: 12px; }
.pl-toolbar__row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.pl-toolbar__spacer { flex: 1 1 auto; }

.pl-search { position: relative; display: flex; align-items: center; min-width: 200px; flex: 1 1 280px; max-width: 420px; }
.pl-search__icon { position: absolute; left: 11px; width: 16px; height: 16px; color: var(--text-subtle); pointer-events: none; }
.pl-search__input { width: 100%; padding: 9px 32px 9px 34px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 13px; font-family: inherit; outline: none; }
.pl-search__input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
.pl-search__input::-webkit-search-cancel-button { display: none; }
.pl-search__clear { position: absolute; right: 8px; display: grid; place-items: center; width: 20px; height: 20px; border: none; background: transparent; color: var(--text-subtle); cursor: pointer; }
.pl-search__clear:hover { color: var(--text); }
.pl-search__clear .vd-svg { width: 14px; height: 14px; }

/* ---- filter dropdowns ---- */
.pl-dd { position: relative; }
.pl-dd__btn { display: inline-flex; align-items: center; gap: 7px; max-width: 260px; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, color .15s; }
.pl-dd__btn .vd-svg { width: 15px; height: 15px; flex: none; }
.pl-dd__btn:hover { background: var(--surface-2); }
.pl-dd__btn--open { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent); }
.pl-dd__btn--on { border-color: color-mix(in srgb, var(--primary) 45%, transparent); background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--text); }
.pl-dd__text { overflow: hidden; text-overflow: ellipsis; }
.pl-dd__one { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--primary); font-weight: 700; }
.pl-dd__count { display: grid; place-items: center; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; background: var(--primary); color: #fff; font-size: 11px; font-weight: 800; }
.pl-dd__chev { opacity: .55; }

.pl-dd__menu { position: absolute; top: calc(100% + 6px); left: 0; z-index: 30; width: 268px; max-width: 80vw; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: var(--shadow-pop); overflow: hidden; }
.pl-dd__menu--right { left: auto; right: 0; }
.pl-dd__searchwrap { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-bottom: 1px solid var(--border); color: var(--text-subtle); }
.pl-dd__searchwrap .vd-svg { width: 15px; height: 15px; flex: none; }
.pl-dd__search { flex: 1 1 auto; min-width: 0; border: none; background: transparent; color: var(--text); font-size: 13px; font-family: inherit; outline: none; }
.pl-dd__list { max-height: 260px; overflow-y: auto; padding: 5px; }
.pl-dd__opt { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--text); }
.pl-dd__opt:hover { background: var(--surface-2); }
.pl-dd__opt input { width: 15px; height: 15px; flex: none; accent-color: var(--primary); cursor: pointer; }
.pl-dd__optlabel { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-dd__none { margin: 0; padding: 14px 10px; text-align: center; font-size: 12.5px; color: var(--text-subtle); }
.pl-dd__foot { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-top: 1px solid var(--border); background: var(--surface-2); }
.pl-dd__spacer { flex: 1 1 auto; }
.pl-dd__link { border: none; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; padding: 2px 4px; }
.pl-dd__link:disabled { opacity: .4; cursor: not-allowed; }
.pl-dd__link--strong { color: var(--primary); }

/* ---- amount range ---- */
.pl-amount { display: flex; flex-direction: column; gap: 11px; padding: 12px; }
.pl-amount__row { display: flex; gap: 10px; }
.pl-amount__field { display: flex; flex-direction: column; gap: 5px; flex: 1 1 0; min-width: 0; }
.pl-amount__lbl { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-subtle); }
.pl-amount__input { width: 100%; min-width: 0; padding: 8px 10px; border-radius: 9px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 13px; font-family: inherit; outline: none; font-variant-numeric: tabular-nums; }
.pl-amount__input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
.pl-amount__err { margin: 0; font-size: 12px; font-weight: 600; color: var(--danger); }
.pl-amount__presets { display: flex; flex-wrap: wrap; gap: 6px; }
.pl-amount__preset { padding: 5px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 12px; font-weight: 650; font-family: inherit; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s, border-color .15s; }
.pl-amount__preset:hover { border-color: var(--border-strong); color: var(--text); }
.pl-amount__preset--on { background: color-mix(in srgb, var(--primary) 14%, transparent); border-color: color-mix(in srgb, var(--primary) 35%, transparent); color: var(--primary); }

/* ---- date range ---- */
.pl-dates { display: inline-flex; align-items: center; gap: 7px; }
.pl-dates__label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.pl-dates__sep { color: var(--text-subtle); }
.pl-dateinput { min-width: 0; padding: 8px 10px; border-radius: 9px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 12.5px; font-family: inherit; outline: none; color-scheme: light dark; }
.pl-dateinput:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }

/* ---- view toggle ---- */
.pl-viewtoggle { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); }
.pl-viewbtn { display: grid; place-items: center; width: 32px; height: 30px; border: none; background: transparent; border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: background .15s, color .15s; }
.pl-viewbtn:hover { color: var(--text); }
.pl-viewbtn--on { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }
.pl-viewbtn .vd-svg { width: 16px; height: 16px; }

/* ---- active filter chips ---- */
.pl-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 11px; border-top: 1px solid var(--border); }
.pl-chips__label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text-subtle); margin-right: 2px; }
.pl-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 260px; padding: 5px 9px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--primary) 32%, transparent); background: color-mix(in srgb, var(--primary) 11%, transparent); color: var(--text); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; overflow: hidden; }
.pl-chip .vd-svg { width: 12px; height: 12px; flex: none; opacity: .6; }
.pl-chip:hover { border-color: var(--primary); }
.pl-chip:hover .vd-svg { opacity: 1; }
.pl-chip__k { color: var(--text-muted); font-weight: 700; }
.pl-chip--clear { background: transparent; border-color: var(--border); color: var(--text-muted); }

/* ---- debug panel ---- */
.pl-debug { border-top: 1px solid var(--border); padding-top: 11px; display: flex; flex-direction: column; gap: 9px; }
.pl-debug__head { display: flex; align-items: center; gap: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-subtle); }
.pl-debug__spacer { flex: 1 1 auto; }
.pl-debug__grid { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; }
.pl-debug__grid dt { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-subtle); }
.pl-debug__grid dd { margin: 1px 0 0; font-size: 13px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.pl-debug__bad { color: var(--danger); }
.pl-debug__code { margin: 0; padding: 10px 12px; border-radius: 9px; background: var(--surface-3); color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 160px; overflow-y: auto; }

/* ---- table ---- */
.pl-tablecard { position: relative; padding: 0; overflow: hidden; }
.pl-busy .pl-table__wrap, .pl-busy .pl-cards { opacity: .55; pointer-events: none; }
.pl-loadbar { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden; background: color-mix(in srgb, var(--primary) 16%, transparent); z-index: 5; }
.pl-loadbar span { display: block; width: 34%; height: 100%; background: var(--primary); animation: pl-slide 1.1s ease-in-out infinite; }
@keyframes pl-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

.pl-table__wrap { overflow-x: auto; }
.pl-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.pl-table thead th { text-align: left; padding: 11px 14px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); background: var(--surface-2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.pl-table thead th.vd-num { text-align: right; }
.pl-table tbody td { padding: var(--row-y) 14px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; font-size: 13px; }
.pl-table tbody tr:last-child td { border-bottom: none; }
.pl-table tbody tr:hover td { background: var(--surface-2); }
.pl-tr--click { cursor: pointer; }
.vd-num { text-align: right; font-variant-numeric: tabular-nums; }
.vd-num--strong { font-weight: 700; }

.pl-th--sortable { padding: 0; }
.pl-sortbtn { display: inline-flex; align-items: center; gap: 6px; width: 100%; padding: 11px 14px; border: none; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
.pl-th--sortable.vd-num .pl-sortbtn { justify-content: flex-end; }
.pl-sortbtn:hover { color: var(--text); }
.pl-sorticon { width: 13px; height: 13px; flex: none; opacity: .35; }
.pl-sorticon--on { opacity: 1; color: var(--primary); }

/* Keeps the project name anchored while the rest of the row scrolls sideways. */
.pl-th--sticky, .pl-td--sticky { position: sticky; left: 0; z-index: 2; }
.pl-th--sticky { background: var(--surface-2); z-index: 3; }
.pl-td--sticky { background: var(--surface); }
.pl-table tbody tr:hover .pl-td--sticky { background: var(--surface-2); }
.pl-th--sticky::after, .pl-td--sticky::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; width: 1px; background: var(--border); }

.pl-title { display: block; font-weight: 650; color: var(--text); line-height: 1.35; }
.pl-addr { display: block; color: var(--text-muted); line-height: 1.35; }
.pl-td--address { max-width: 300px; }
.pl-tag { display: inline-block; margin: 1px 4px 1px 0; padding: 3px 8px; border-radius: 6px; background: var(--surface-3); color: var(--text-muted); font-size: 11.5px; font-weight: 650; }
.pl-action { padding: 6px 12px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); background: color-mix(in srgb, var(--primary) 12%, transparent); color: color-mix(in srgb, var(--primary) 80%, var(--text)); font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
.pl-action:hover { background: var(--primary); color: #fff; border-color: transparent; }
.pl-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.pl-iconbtn { display: grid; place-items: center; width: 30px; height: 28px; flex: none; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.pl-iconbtn:hover { background: var(--surface-3); color: var(--primary); border-color: var(--border-strong); }
.pl-iconbtn .vd-svg { width: 15px; height: 15px; }

/* Actions stay pinned to the right edge while the rest of the row scrolls. */
.pl-th--actions, .pl-td--actions { position: sticky; right: 0; text-align: right; }
.pl-th--actions { background: var(--surface-2); z-index: 3; }
.pl-td--actions { background: var(--surface); z-index: 2; }
.pl-table tbody tr:hover .pl-td--actions { background: var(--surface-2); }
.pl-th--actions::before, .pl-td--actions::before { content: ""; position: absolute; top: 0; left: 0; bottom: 0; width: 1px; background: var(--border); }

/* skeleton */
.pl-skrow td { padding: var(--row-y) 14px; border-bottom: 1px solid var(--border); }
.pl-sk { display: block; height: 12px; border-radius: 6px; background: linear-gradient(90deg, var(--surface-3) 25%, var(--surface-2) 37%, var(--surface-3) 63%); background-size: 400% 100%; animation: pl-shim 1.3s ease infinite; }
@keyframes pl-shim { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

/* ---- pills ---- */
.vd-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; flex: none; background: var(--surface-3); color: var(--text-muted); }
.vd-pill__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.vd-pill--success { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
.vd-pill--warning { background: color-mix(in srgb, var(--warning) 14%, transparent); color: var(--warning); }
.vd-pill--danger  { background: color-mix(in srgb, var(--danger) 14%, transparent);  color: var(--danger); }
.vd-pill--info    { background: color-mix(in srgb, var(--info) 14%, transparent);    color: var(--info); }
.vd-pill--violet  { background: color-mix(in srgb, var(--violet) 14%, transparent);  color: var(--violet); }
.vd-pill--teal    { background: color-mix(in srgb, var(--teal) 14%, transparent);    color: var(--teal); }
.vd-pill--slate   { background: var(--surface-3); color: var(--text-muted); }

/* ---- cards view ---- */
.pl-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; padding: clamp(14px, 2vw, 18px); }
.pl-card { display: flex; flex-direction: column; gap: 11px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); padding: 15px; min-width: 0; transition: border-color .15s, box-shadow .15s, transform .15s; }
.pl-card--click { cursor: pointer; }
.pl-card--click:hover { transform: translateY(-2px); box-shadow: var(--shadow-pop); border-color: var(--border-strong); }
.pl-card__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.pl-card__title { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--text); min-width: 0; line-height: 1.35; }
.pl-card__addr { margin: 0; display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; color: var(--text-muted); }
.pl-card__addr .vd-svg { width: 14px; height: 14px; flex: none; margin-top: 1px; }
.pl-card__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 12px; margin: 0; }
.pl-card__grid dt { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-subtle); }
.pl-card__grid dd { margin: 2px 0 0; font-size: 13px; color: var(--text); overflow-wrap: anywhere; }
.pl-card__actions { display: flex; align-items: center; gap: 7px; margin-top: auto; }
.pl-card__actions .pl-iconbtn { width: 34px; height: 34px; }
.pl-cards .vd-empty { grid-column: 1 / -1; }

/* ---- pager ---- */
.vd-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 11px clamp(14px, 2vw, 18px); border-top: 1px solid var(--border); background: var(--surface-2); }
.vd-pager__info { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
.vd-pager__nav { display: flex; align-items: center; gap: 4px; }
.vd-pager__btn { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.vd-pager__btn:hover:not(:disabled) { background: var(--surface-3); color: var(--text); border-color: var(--border-strong); }
.vd-pager__btn:disabled { opacity: .4; cursor: not-allowed; }
.vd-pager__btn .vd-svg { width: 15px; height: 15px; }
.vd-pager__num { min-width: 30px; height: 30px; padding: 0 8px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; font-variant-numeric: tabular-nums; }
.vd-pager__num:hover { background: var(--surface-3); color: var(--text); }
.vd-pager__num--on { background: var(--primary); color: #fff; }
.vd-pager__num--on:hover { background: var(--primary); color: #fff; }
.vd-pager__gap { color: var(--text-subtle); padding: 0 2px; }

.pl-pagesize, .pl-jump { display: inline-flex; align-items: center; gap: 7px; }
.pl-pagesize__label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.pl-select, .pl-jump__input { padding: 6px 9px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 12.5px; font-family: inherit; outline: none; cursor: pointer; }
.pl-jump__input { width: 68px; cursor: text; font-variant-numeric: tabular-nums; }
.pl-select:focus, .pl-jump__input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }

/* ---- empty ---- */
.vd-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 16px; color: var(--text-subtle); text-align: center; }
.vd-empty .vd-svg { width: 34px; height: 34px; }

/* ---- narrow containers ---- */
@container (max-width: 720px) {
  .pl-headactions { width: 100%; }
  .pl-search { max-width: none; flex-basis: 100%; }
  .pl-dd__btn { max-width: none; }
  /* A native date input has a wide intrinsic size — let the pair share the row. */
  .pl-dates { display: flex; width: 100%; }
  .pl-dateinput { flex: 1 1 0; }
  .vd-pager { justify-content: center; }
  .vd-pager__info { width: 100%; text-align: center; }
}
@container (max-width: 480px) {
  .pl-card__grid { grid-template-columns: minmax(0, 1fr); }
  .pl-dd__menu { width: 240px; }
}
</style>
