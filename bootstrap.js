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

function ensureFeedSortState(view) {
  if (!view.collectionTreeRow?.isFeedsOrFeed?.()) {
    return;
  }

  let columns = view._getColumns();
  let sortedColumn = view._sortedColumn;

  if (
    !sortedColumn
    || !columns.includes(sortedColumn)
    || !sortedColumn.sortDirection
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
    getSortDirection: view.getSortDirection
  };

  view.getSortField = function () {
    if (this.collectionTreeRow?.isFeedsOrFeed?.()) {
      ensureFeedSortState(this);
      return this._sortedColumn?.dataKey || "date";
    }
    return original.getSortField.apply(this, arguments);
  };

  view.getSortDirection = function (sortFields) {
    if (this.collectionTreeRow?.isFeedsOrFeed?.()) {
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

  patchedViews.set(view, original);

  if (view.collectionTreeRow?.isFeedsOrFeed?.()) {
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

  if (view.collectionTreeRow?.isFeedsOrFeed?.()) {
    for (let column of view._getColumns()) {
      delete column.sortDirection;
    }
    view._sortedColumn = null;
    await view.sort();
    view.forceUpdate();
  }
}
