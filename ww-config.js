export default {
  editor: {
    label: { en: "Projects — List" },
    icon: "list",
  },
  triggerEvents: [
    // ---- the important one ----------------------------------------------
    // Fires whenever ANYTHING that shapes the result set changes: search,
    // a filter, the sort, the page, or the page size. `query` carries the
    // whole request in one object — page/limit/offset, the raw filter values,
    // an Airtable sort array, and a ready-to-use filterByFormula string.
    // Bind it to a workflow that fetches `projects_search` with those params.
    {
      name: "queryChange",
      label: { en: "On query change (fetch here)" },
      event: {
        query: {
          page: 1, pageSize: 25, limit: 25, offset: 0,
          search: "",
          filters: { search: "", client: [], status: [], lob: [], assigned: [], createdFrom: "", createdTo: "" },
          sort: [{ field: "creation_date", direction: "desc" }],
          sortField: "creation_date", sortDirection: "desc",
          filterByFormula: "",
          reason: "init",
        },
      },
    },
    { name: "pageChange", label: { en: "On page change" }, event: { page: 1, pageSize: 25, offset: 0, limit: 25 } },
    { name: "searchChange", label: { en: "On search" }, event: { search: "" } },
    { name: "filterChange", label: { en: "On filter change" }, event: { key: "status", values: [], filters: {} } },
    { name: "sortChange", label: { en: "On sort change" }, event: { field: "creation_date", direction: "desc" } },
    { name: "refresh", label: { en: "On refresh click" }, event: {} },
    { name: "projectClick", label: { en: "On project / 'View Details' click" }, event: { index: 0, id: "", item: {} } },
    { name: "openNewTab", label: { en: "On 'open in new tab' click" }, event: { index: 0, id: "", item: {}, url: "" } },
    { name: "createProject", label: { en: "On 'Create Project'" }, event: {} },
    { name: "exportCsv", label: { en: "On CSV download" }, event: { count: 0 } },
  ],
  properties: {
    // ============================ HEADER ============================
    title: { label: { en: "Title" }, type: "Text", defaultValue: "Projects", bindable: true },
    subtitle: { label: { en: "Subtitle" }, type: "Text", defaultValue: "", bindable: true },
    showCreate: { label: { en: "Show 'Create Project'" }, type: "OnOff", defaultValue: true, bindable: true },
    createLabel: { label: { en: "'Create Project' label" }, type: "Text", defaultValue: "Create Project", bindable: true },
    showRefresh: { label: { en: "Show 'Refresh'" }, type: "OnOff", defaultValue: true, bindable: true },
    showStats: { label: { en: "Show summary tiles" }, type: "OnOff", defaultValue: false, bindable: true },
    showExport: { label: { en: "Show 'CSV'" }, type: "OnOff", defaultValue: true, bindable: true },

    // ============================ DATA ============================
    // Bind `projects_search.data`. In server mode this is ONE PAGE of rows and
    // the section renders it as-is — no client filtering, no client slicing.
    rows: {
      label: { en: "Rows (bind projects_search.data)" }, type: "Array", bindable: true,
      defaultValue: [
        { id: "rec011", UID: "Project#11 - 3999 Matty Drive Northeast", Status: "Canceled", "Address CONCAT": "3999 Matty Drive Northeast, Marietta, GA 30066, USA", Customer: ["recCUST00001"], assigned_to_id: ["recUSER00001"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Amanda Terranova"], customer_name: ["Jerry Todd"], lob_name: ["Repipe"], "Approved Revenue": 8450, "WO#": "WO#11024", creation_date: "2026-05-02T14:10:00.000Z" },
        { id: "rec012", UID: "Project#12 - 2090 Wilshire Drive Southwest", Status: "Canceled", "Address CONCAT": "2090 Wilshire Drive Southwest, Marietta, GA 30064, USA", Customer: ["recCUST00002"], assigned_to_id: ["recUSER00002"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Charlie Binder"], customer_name: ["Repipe Specialists - Sales"], lob_name: ["Repipe"], "Approved Revenue": 12300, "WO#": "WO#11025", creation_date: "2026-05-04T09:22:00.000Z" },
        { id: "rec013", UID: "Project#13 - 2777 Mathews Street", Status: "Canceled", "Address CONCAT": "2777 Mathews Street, Smyrna, GA 30080, USA", Customer: ["recCUST00003"], assigned_to_id: ["recUSER00001"], lob_supabase_id: ["f38a8ca9-206c-47d3-b5f5-a2b18978ca4a"], assigned_to_name: ["Amanda Terranova"], customer_name: ["Kevin Sardja"], lob_name: ["Maintenance"], "Approved Revenue": 1950, "WO#": "WO#11026", creation_date: "2026-05-06T16:40:00.000Z" },
        { id: "rec014", UID: "Project#14 - 1095 Dogwood Park Drive", Status: "Completed", "Address CONCAT": "1095 Dogwood Park Drive, Lawrenceville, GA 30046, USA", Customer: ["recCUST00004"], assigned_to_id: ["recUSER00001"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Amanda Terranova"], customer_name: ["Kyle and Hannah Keener"], lob_name: ["Repipe"], "Approved Revenue": 14875, "WO#": "WO#11027", creation_date: "2026-05-09T11:05:00.000Z" },
        { id: "rec015", UID: "Project#15 - 3999 Matty Drive Northeast", Status: "Canceled", "Address CONCAT": "3999 Matty Drive Northeast, Marietta, GA 30066, USA", Customer: ["recCUST00001"], assigned_to_id: ["recUSER00003"], lob_supabase_id: ["f38a8ca9-206c-47d3-b5f5-a2b18978ca4a"], assigned_to_name: ["Chase Eby"], customer_name: ["Jerry Todd"], lob_name: ["Maintenance"], "Approved Revenue": 640, "WO#": "WO#11028", creation_date: "2026-05-11T08:15:00.000Z" },
        { id: "rec016", UID: "Project#16 - 1250 Valley Reserve Drive Northwest", Status: "Completed", "Address CONCAT": "1250 Valley Reserve Drive Northwest, Kennesaw, GA 30152, USA", Customer: ["recCUST00005"], assigned_to_id: ["recUSER00003"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Chase Eby"], customer_name: ["Kane Sanders"], lob_name: ["Repipe"], "Approved Revenue": 9720, "WO#": "WO#11029", creation_date: "2026-05-14T13:30:00.000Z" },
        { id: "rec017", UID: "Project#17 - 2336 Loughridge Drive", Status: "In Progress", "Address CONCAT": "2336 Loughridge Drive, Buford, GA 30519, USA", Customer: ["recCUST00006"], assigned_to_id: ["recUSER00001"], lob_supabase_id: ["687b15d4-a26e-4d94-beba-94831d814274"], assigned_to_name: ["Amanda Terranova"], customer_name: ["Ernest Latimore"], lob_name: ["Water Heater"], "Approved Revenue": 3200, "WO#": "WO#11030", creation_date: "2026-05-18T10:00:00.000Z" },
        { id: "rec018", UID: "Project#18 - 2336 Loughridge Drive", Status: "Completed", "Address CONCAT": "2336 Loughridge Drive, Buford, GA 30519, USA", Customer: ["recCUST00006"], assigned_to_id: ["recUSER00001"], lob_supabase_id: ["687b15d4-a26e-4d94-beba-94831d814274"], assigned_to_name: ["Amanda Terranova"], customer_name: ["Ernest Latimore"], lob_name: ["Water Heater"], "Approved Revenue": 4180, "WO#": "WO#11031", creation_date: "2026-05-21T15:45:00.000Z" },
        { id: "rec019", UID: "Project#19 - 1250 Valley Reserve Drive Northwest", Status: "Completed", "Address CONCAT": "1250 Valley Reserve Drive Northwest, Kennesaw, GA 30152, USA", Customer: ["recCUST00005"], assigned_to_id: ["recUSER00002"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Charlie Binder"], customer_name: ["Kane Sanders"], lob_name: ["Repipe"], "Approved Revenue": 11040, "WO#": "WO#11032", creation_date: "2026-05-25T12:20:00.000Z" },
        { id: "rec020", UID: "Project#20 - 5758 Mitchell Chase Trail", Status: "Canceled", "Address CONCAT": "5758 Mitchell Chase Trail, Mableton, GA 30126, USA", Customer: ["recCUST00007"], assigned_to_id: ["recUSER00004"], lob_supabase_id: ["f38a8ca9-206c-47d3-b5f5-a2b18978ca4a"], assigned_to_name: ["Walter Gaw"], customer_name: ["Linda Lu"], lob_name: ["Maintenance"], "Approved Revenue": 875, "WO#": "WO#11033", creation_date: "2026-05-28T09:50:00.000Z" },
        { id: "rec021", UID: "Project#21 - 5038 Kendall Station Northwest", Status: "Scheduled", "Address CONCAT": "5038 Kendall Station Northwest, Acworth, GA 30101, USA", Customer: ["recCUST00008"], assigned_to_id: ["recUSER00004"], lob_supabase_id: ["f737c863-bb4e-4088-88de-92aa7848179f"], assigned_to_name: ["Walter Gaw"], customer_name: ["Jon Talley"], lob_name: ["Repipe"], "Approved Revenue": 10250, "WO#": "WO#11034", creation_date: "2026-06-02T14:05:00.000Z" },
        { id: "rec022", UID: "Project#22 - 411 Havenwood Court", Status: "On Hold", "Address CONCAT": "411 Havenwood Court, Woodstock, GA 30188, USA", Customer: ["recCUST00009"], assigned_to_id: ["recUSER00003"], lob_supabase_id: ["687b15d4-a26e-4d94-beba-94831d814274"], assigned_to_name: ["Chase Eby"], customer_name: ["Maria Delgado"], lob_name: ["Water Heater"], "Approved Revenue": 2760, "WO#": "WO#11035", creation_date: "2026-06-08T11:35:00.000Z" },
      ],
    },
    // Bind `projects_search.total` — the SERVER's total, not rows.length. This is
    // what the pager counts pages from. Falls back to rows.length when unbound.
    totalCount: { label: { en: "Total count (bind projects_search.total)" }, type: "Number", defaultValue: null, bindable: true },
    // Bind `projects_search.isFetching` so the table dims while a page loads.
    loading: { label: { en: "Loading (bind projects_search.isFetching)" }, type: "OnOff", defaultValue: false, bindable: true },
    // ON  = the bound rows are one page straight from the server; render as-is.
    // OFF = the bound rows are the whole set; filter, sort and page in the browser.
    serverMode: { label: { en: "Server-side data (backend pagination)" }, type: "OnOff", defaultValue: true, bindable: true },
    // Emit `queryChange` once on mount so the first page loads without a
    // separate "on page load" workflow.
    fetchOnMount: { label: { en: "Fire query on mount" }, type: "OnOff", defaultValue: true, bindable: true, section: "settings" },
    emptyText: { label: { en: "Empty state text" }, type: "Text", defaultValue: "No projects match these filters", bindable: true, section: "settings" },

    // ============================ SEARCH ============================
    showSearch: { label: { en: "Show search" }, type: "OnOff", defaultValue: true, bindable: true },
    searchPlaceholder: { label: { en: "Search placeholder" }, type: "Text", defaultValue: "Search projects…", bindable: true },
    searchDebounce: { label: { en: "Search debounce (ms)" }, type: "Number", options: { min: 0, max: 3000, step: 50 }, defaultValue: 350, bindable: true, section: "settings" },

    // ============================ FILTERS ============================
    // Every filter is a multi-select whose options come from ITS OWN bound list.
    // Leave a list unbound and the options are derived from the loaded rows
    // instead (fine for client mode, only the current page in server mode).
    showClientFilter: { label: { en: "Show Client filter" }, type: "OnOff", defaultValue: true, bindable: true },
    clientLabel: { label: { en: "Client filter label" }, type: "Text", defaultValue: "Client", bindable: true },
    // Bind the Customers collection. Value defaults to its Airtable record id,
    // which is what the project's `Customer` column holds.
    clientOptions: { label: { en: "Client options (bind a list)" }, type: "Array", defaultValue: [], bindable: true },
    clientOptionLabel: { label: { en: "Client option label field" }, type: "Text", defaultValue: "UID,name,Name", bindable: true, section: "settings" },
    clientOptionValue: { label: { en: "Client option value field" }, type: "Text", defaultValue: "id,airtable_id", bindable: true, section: "settings" },

    showStatusFilter: { label: { en: "Show Status filter" }, type: "OnOff", defaultValue: true, bindable: true },
    statusLabel: { label: { en: "Status filter label" }, type: "Text", defaultValue: "Status", bindable: true },
    statusOptions: { label: { en: "Status options (bind a list)" }, type: "Array", defaultValue: [], bindable: true },
    statusOptionLabel: { label: { en: "Status option label field" }, type: "Text", defaultValue: "name", bindable: true, section: "settings" },
    statusOptionValue: { label: { en: "Status option value field" }, type: "Text", defaultValue: "name", bindable: true, section: "settings" },

    showLobFilter: { label: { en: "Show LOB filter" }, type: "OnOff", defaultValue: true, bindable: true },
    lobLabel: { label: { en: "LOB filter label" }, type: "Text", defaultValue: "LOB", bindable: true },
    // Bind the LOBs collection. Value defaults to its Supabase uuid (`id`), which
    // is what the project's `lob_supabase_id` column holds — NOT airtable_record_id.
    lobOptions: { label: { en: "LOB options (bind a list)" }, type: "Array", defaultValue: [], bindable: true },
    lobOptionLabel: { label: { en: "LOB option label field" }, type: "Text", defaultValue: "name", bindable: true, section: "settings" },
    lobOptionValue: { label: { en: "LOB option value field" }, type: "Text", defaultValue: "id", bindable: true, section: "settings" },

    showAssignedFilter: { label: { en: "Show Assigned To filter" }, type: "OnOff", defaultValue: true, bindable: true },
    assignedLabel: { label: { en: "Assigned To filter label" }, type: "Text", defaultValue: "Assigned To", bindable: true },
    // Bind the Users collection. Value defaults to its Airtable record id, which
    // is what the project's `assigned_to_id` column holds.
    assignedOptions: { label: { en: "Assigned To options (bind a list)" }, type: "Array", defaultValue: [], bindable: true },
    assignedOptionLabel: { label: { en: "Assigned option label field" }, type: "Text", defaultValue: "name", bindable: true, section: "settings" },
    assignedOptionValue: { label: { en: "Assigned option value field" }, type: "Text", defaultValue: "airtable_record_id,record_id,id", bindable: true, section: "settings" },

    // Numeric range on the amount column, rather than a list of values.
    showAmountFilter: { label: { en: "Show Amount range filter" }, type: "OnOff", defaultValue: true, bindable: true },
    amountLabel: { label: { en: "Amount filter label" }, type: "Text", defaultValue: "Amount", bindable: true },
    // Quick-pick ranges as `min-max` pairs; an open end is allowed on either side
    // ("-1000" = up to 1,000, "25000-" = 25,000 and up). Labels are generated.
    amountPresets: { label: { en: "Amount quick ranges (min-max, comma-separated)" }, type: "Text", defaultValue: "-1000,1000-5000,5000-25000,25000-", bindable: true, section: "settings" },

    showDateFilter: { label: { en: "Show created-date range" }, type: "OnOff", defaultValue: false, bindable: true },

    // ============================ COLUMNS ============================
    // Comma-separated keys, in display order. Available keys:
    // title, status, address, assigned, customer, amount, wo, created, lob, actions
    visibleColumns: {
      label: { en: "Columns (ordered, comma-separated)" }, type: "Text", bindable: true,
      defaultValue: "title,status,address,assigned,customer,amount,wo,created,lob,actions",
    },
    showColumnPicker: { label: { en: "Show column picker" }, type: "OnOff", defaultValue: true, bindable: true },
    actionLabel: { label: { en: "Row action label" }, type: "Text", defaultValue: "View Details", bindable: true },
    // Second action in the (right-pinned) Actions column. With a URL set it opens
    // that page in a new browser tab; either way it fires `openNewTab`.
    showOpenNewTab: { label: { en: "Show 'open in new tab' button" }, type: "OnOff", defaultValue: true, bindable: true },
    newTabLabel: { label: { en: "'Open in new tab' tooltip" }, type: "Text", defaultValue: "Open in new tab", bindable: true },
    // Placeholders in braces are filled from the row: {id}, {title}, {wo},
    // {status}… and any raw collection column, e.g. /projects/{id} or {Stacker Display}.
    // Leave empty to handle the click with a workflow instead.
    newTabUrl: { label: { en: "New-tab URL (e.g. /project/{id})" }, type: "Text", defaultValue: "", bindable: true },
    rowClickOpens: { label: { en: "Clicking a row opens the project" }, type: "OnOff", defaultValue: true, bindable: true },
    currency: { label: { en: "Currency code" }, type: "Text", defaultValue: "USD", bindable: true, section: "settings" },

    // ============================ FIELD MAPPING ============================
    // Which column on a row feeds each cell. Comma-separated; first key present
    // on the row wins. Defaults match the `projects_search` collection.
    fieldId: { label: { en: "Field — record id" }, type: "Text", defaultValue: "id", bindable: true, section: "settings" },
    fieldTitle: { label: { en: "Field — title" }, type: "Text", defaultValue: "UID", bindable: true, section: "settings" },
    fieldStatus: { label: { en: "Field — status" }, type: "Text", defaultValue: "Status", bindable: true, section: "settings" },
    fieldAddress: { label: { en: "Field — address" }, type: "Text", defaultValue: "Address CONCAT", bindable: true, section: "settings" },
    fieldAssigned: { label: { en: "Field — assigned to" }, type: "Text", defaultValue: "assigned_to_name", bindable: true, section: "settings" },
    fieldCustomer: { label: { en: "Field — customer" }, type: "Text", defaultValue: "customer_name", bindable: true, section: "settings" },
    fieldAmount: { label: { en: "Field — amount" }, type: "Text", defaultValue: "Approved Revenue", bindable: true, section: "settings" },
    fieldWo: { label: { en: "Field — WO#" }, type: "Text", defaultValue: "WO#", bindable: true, section: "settings" },
    fieldCreated: { label: { en: "Field — creation date" }, type: "Text", defaultValue: "creation_date,Creation Date", bindable: true, section: "settings" },
    fieldLob: { label: { en: "Field — LOB" }, type: "Text", defaultValue: "lob_name", bindable: true, section: "settings" },

    // ---- match fields ----
    // The columns the FILTERS compare against, as opposed to the *_name columns
    // above which are only ever displayed. These hold ids (arrays of them), so a
    // filter keeps working when someone is renamed. Status has no id — it is
    // matched on its own text column (fieldStatus).
    fieldCustomerId: { label: { en: "Match field — customer id" }, type: "Text", defaultValue: "Customer", bindable: true, section: "settings" },
    fieldAssignedId: { label: { en: "Match field — assigned-to id" }, type: "Text", defaultValue: "assigned_to_id", bindable: true, section: "settings" },
    fieldLobId: { label: { en: "Match field — LOB id" }, type: "Text", defaultValue: "lob_supabase_id", bindable: true, section: "settings" },
    // The single concatenated text column the search formula runs SEARCH() against.
    fieldSearch: { label: { en: "Field — search text (formula target)" }, type: "Text", defaultValue: "search_query", bindable: true, section: "settings" },

    // ============================ SORT ============================
    sortField: {
      label: { en: "Initial sort column" }, type: "TextSelect", bindable: true, defaultValue: "created",
      options: { options: [
        { value: "created", label: { en: "Creation date" } },
        { value: "title", label: { en: "Title" } },
        { value: "status", label: { en: "Status" } },
        { value: "address", label: { en: "Address" } },
        { value: "customer", label: { en: "Customer" } },
        { value: "assigned", label: { en: "Assigned To" } },
        { value: "amount", label: { en: "Amount" } },
        { value: "wo", label: { en: "WO#" } },
        { value: "lob", label: { en: "LOB" } },
      ] },
    },
    sortDirection: {
      label: { en: "Initial sort direction" }, type: "TextSelect", bindable: true, defaultValue: "desc",
      options: { options: [
        { value: "desc", label: { en: "Descending" } },
        { value: "asc", label: { en: "Ascending" } },
      ] },
    },

    // ============================ PAGINATION ============================
    pageSize: { label: { en: "Rows per page" }, type: "Number", options: { min: 1, max: 500, step: 1 }, defaultValue: 25, bindable: true },
    pageSizeOptions: { label: { en: "Rows-per-page choices" }, type: "Text", defaultValue: "25,50,100,200", bindable: true, section: "settings" },
    showPageSize: { label: { en: "Show rows-per-page picker" }, type: "OnOff", defaultValue: true, bindable: true },

    // ============================ THEMING ============================
    view: {
      label: { en: "Layout" }, type: "TextSelect", bindable: true, defaultValue: "table",
      options: { options: [
        { value: "table", label: { en: "Table" } },
        { value: "cards", label: { en: "Cards" } },
      ] },
    },
    density: {
      label: { en: "Row density" }, type: "TextSelect", bindable: true, defaultValue: "compact",
      options: { options: [
        { value: "compact", label: { en: "Compact" } },
        { value: "comfortable", label: { en: "Comfortable" } },
      ] },
    },
    primaryColor: { label: { en: "Primary color" }, type: "Color", defaultValue: "#10b981", bindable: true },
    accentColor: { label: { en: "Accent color" }, type: "Color", defaultValue: "#2563eb", bindable: true },
    darkMode: {
      label: { en: "Theme mode" }, type: "TextSelect",
      options: { options: [
        { value: "auto", label: { en: "Auto (system)" } }, { value: "light", label: { en: "Light" } }, { value: "dark", label: { en: "Dark" } },
      ] }, defaultValue: "auto", bindable: true,
    },
    radius: { label: { en: "Corner radius (px)" }, type: "Number", options: { min: 0, max: 32, step: 1 }, defaultValue: 14, bindable: true },
    // Clearance under the pager so a fixed bottom nav bar can't cover it. The
    // section also adds the device's safe-area inset on top of this.
    bottomSpace: { label: { en: "Bottom space for nav bar (px)" }, type: "Number", options: { min: 0, max: 300, step: 4 }, defaultValue: 96, bindable: true },
  },
};
