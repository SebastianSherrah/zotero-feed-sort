var patchedViews = new Map();
var originalIsSortable;

function install() {}

async function startup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise
  ]);

  enableFeedHeaderSorting();

  for (let window of Zotero.getMainWindows()) {
    await patchWindow(window);
  }
}

async function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  for (let [view, original] of patchedViews) {
    await restoreView(view, original);
  }
  patchedViews.clear();
  disableFeedHeaderSorting();
}

function uninstall() {}

async function onMainWindowLoad({ window }) {
  await patchWindow(window);
}

async function onMainWindowUnload({ window }) {
  let view = window.ZoteroPane?.itemsView;
  let original = patchedViews.get(view);
  if (!original) {
    return;
  }

  await restoreView(view, original);
  patchedViews.delete(view);
}

function enableFeedHeaderSorting() {
  if (originalIsSortable) {
    return;
  }

  let prototype = Zotero.CollectionTreeRow.prototype;
  originalIsSortable = prototype.isSortable;
  prototype.isSortable = function () {
    if (this.isFeedsOrFeed?.()) {
      return true;
    }
    return originalIsSortable.apply(this, arguments);
  };
}

function disableFeedHeaderSorting() {
  if (!originalIsSortable) {
    return;
  }

  Zotero.CollectionTreeRow.prototype.isSortable = originalIsSortable;
  originalIsSortable = null;
}

// Zotero 10 replaced the items view's single collectionTreeRow with
// collectionTreeRows and a view-level isFeedsOrFeed()
function isFeedView(view) {
  if (typeof view.isFeedsOrFeed === "function") {
    return view.isFeedsOrFeed();
  }
  return !!view.collectionTreeRow?.isFeedsOrFeed?.();
}

// Zotero 10 marks the first visible column as sorted when no sort has been
// saved, so only a saved sort direction counts as the user's choice
function hasSavedSort(view) {
  if (typeof view._getColumnPrefs !== "function") {
    return true;
  }
  return Object.values(view._getColumnPrefs())
    .some((settings) => settings?.sortDirection);
}

function ensureFeedSortState(view) {
  if (!isFeedView(view)) {
    return;
  }

  let columns = view._getColumns();
  let sortedColumn = view._sortedColumn;

  if (
    !sortedColumn
    || !columns.includes(sortedColumn)
    || !sortedColumn.sortDirection
    || !hasSavedSort(view)
  ) {
    let dateColumn = columns.find((column) => column.dataKey === "date");
    if (!dateColumn) {
      return;
    }

    for (let column of columns) {
      if (column !== dateColumn) {
        delete column.sortDirection;
      }
    }

    dateColumn.sortDirection = -1;
    view._sortedColumn = dateColumn;
  }
}

async function patchWindow(window) {
  let view = window.ZoteroPane?.itemsView;
  if (!view || patchedViews.has(view)) {
    return;
  }

  let original = {
    getSortField: view.getSortField,
    getSortDirection: view.getSortDirection,
    handleColumnSort: view._handleColumnSort
  };

  view.getSortField = function () {
    if (isFeedView(this)) {
      ensureFeedSortState(this);
      return this._sortedColumn?.dataKey || "date";
    }
    return original.getSortField.apply(this, arguments);
  };

  view.getSortDirection = function (sortFields) {
    if (isFeedView(this)) {
      ensureFeedSortState(this);
      let fields = sortFields || this.getSortFields();
      for (let field of fields) {
        let column = this._getColumns().find(
          (candidate) => candidate.dataKey === field
        );
        if (column?.sortDirection) {
          return column.sortDirection;
        }
      }
      return this.getSortField() === "date" ? -1 : 1;
    }
    return original.getSortDirection.call(this, sortFields);
  };

  // Zotero only saves a column's sort direction if that column already has
  // saved settings, so create them to make the chosen feed sort persist
  if (original.handleColumnSort) {
    // Passed unbound to the table as onColumnSort, so capture the view
    view._handleColumnSort = (index, sortDirection) => {
      if (isFeedView(view) && view.props?.columnPicker) {
        let column = view._getColumn(index);
        view._columnPrefs ||= {};
        if (column && !view._columnPrefs[column.dataKey]) {
          view._columnPrefs[column.dataKey] = { dataKey: column.dataKey };
        }
      }
      return original.handleColumnSort(index, sortDirection);
    };
  }

  patchedViews.set(view, original);

  if (isFeedView(view)) {
    ensureFeedSortState(view);
    await view.sort();
    view.forceUpdate();
  }

  Zotero.debug(
    "Zotero Feed Sort: feed columns are sortable; Date defaults to newest first"
  );
}

async function restoreView(view, original) {
  if (!view || !original) {
    return;
  }

  view.getSortField = original.getSortField;
  view.getSortDirection = original.getSortDirection;
  if (original.handleColumnSort) {
    view._handleColumnSort = original.handleColumnSort;
  }

  if (isFeedView(view)) {
    for (let column of view._getColumns()) {
      delete column.sortDirection;
    }
    view._sortedColumn = null;
    // Zotero 10 caches columns; rebuild them from Zotero's own settings
    if ("_columnsId" in view) {
      view._columnsId = null;
    }
    await view.sort();
    view.forceUpdate();
  }
}
