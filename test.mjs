import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
for (let iconPath of Object.values(manifest.icons)) {
  assert.equal(fs.existsSync(iconPath), true, `Missing icon: ${iconPath}`);
}

let context = {
  APP_SHUTDOWN: 2,
  Map,
  Zotero: {
    CollectionTreeRow: function CollectionTreeRow() {},
    debug() {},
    getMainWindows() {
      return [];
    }
  }
};
context.Zotero.CollectionTreeRow.prototype.isSortable = function () {
  return false;
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("bootstrap.js", "utf8"), context);

let sortCalls = 0;
let forceUpdateCalls = 0;
let dateColumn = { dataKey: "date" };
let titleColumn = { dataKey: "title" };
let feedView = {
  collectionTreeRow: {
    isFeedsOrFeed() {
      return true;
    }
  },
  _columns: [titleColumn, dateColumn],
  _sortedColumn: null,
  _getColumns() {
    return this._columns;
  },
  getSortField() {
    return "id";
  },
  getSortFields() {
    return [this.getSortField()];
  },
  getSortDirection() {
    return 1;
  },
  async sort() {
    sortCalls++;
  },
  forceUpdate() {
    forceUpdateCalls++;
  }
};
let feedWindow = { ZoteroPane: { itemsView: feedView } };

context.enableFeedHeaderSorting();
await context.patchWindow(feedWindow);
assert.equal(feedView.getSortField(), "date");
assert.equal(feedView.getSortDirection(), -1);
assert.equal(dateColumn.sortDirection, -1);
assert.equal(feedView._sortedColumn, dateColumn);
assert.equal(sortCalls, 1);
assert.equal(forceUpdateCalls, 1);

dateColumn.sortDirection = 1;
assert.equal(feedView.getSortDirection(), 1);

let feedRow = new context.Zotero.CollectionTreeRow();
feedRow.isFeedsOrFeed = () => true;
assert.equal(feedRow.isSortable(), true);

let normalView = {
  collectionTreeRow: {
    isFeedsOrFeed() {
      return false;
    }
  },
  _getColumns() {
    return [];
  },
  getSortField() {
    return "title";
  },
  getSortDirection() {
    return 1;
  },
  async sort() {
    throw new Error("Normal views should not be re-sorted during installation");
  },
  forceUpdate() {
    throw new Error("Normal views should not be re-rendered during installation");
  }
};
let normalWindow = { ZoteroPane: { itemsView: normalView } };

await context.patchWindow(normalWindow);
assert.equal(normalView.getSortField(), "title");
assert.equal(normalView.getSortDirection(), 1);

await context.shutdown({}, 0);
assert.equal(feedView.getSortField(), "id");
assert.equal(feedView.getSortDirection(), 1);
assert.equal(normalView.getSortField(), "title");
assert.equal(normalView.getSortDirection(), 1);
assert.equal(feedRow.isSortable(), false);

// Zotero 10: view-level isFeedsOrFeed(), and the first visible column is
// marked as sorted when no sort has been saved
context.enableFeedHeaderSorting();

function makeZotero10FeedView(columnPrefs) {
  let title = { dataKey: "title", sortDirection: 1 };
  let date = { dataKey: "date" };
  let view = {
    props: { columnPicker: true },
    _columnPrefs: columnPrefs,
    _columnsId: "item-tree-main-feed-feed",
    _columns: [title, date],
    _sortedColumn: title,
    sortCalls: 0,
    isFeedsOrFeed() {
      return true;
    },
    _getColumnPrefs() {
      return this._columnPrefs || {};
    },
    _getColumns() {
      return this._columns;
    },
    _getColumn(index) {
      return this._columns[index];
    },
    getSortField() {
      return "id";
    },
    getSortFields() {
      return [this.getSortField()];
    },
    getSortDirection() {
      return -1;
    },
    async sort() {
      this.sortCalls++;
    },
    forceUpdate() {}
  };
  view._handleColumnSort = async (index, sortDirection) => {
    let prefs = view._getColumnPrefs();
    let column = view._getColumn(index);
    delete view._sortedColumn.sortDirection;
    view._sortedColumn = column;
    column.sortDirection = sortDirection;
    if (prefs[column.dataKey]) {
      prefs[column.dataKey].sortDirection = sortDirection;
    }
    await view.sort();
  };
  return { view, title, date };
}

let unsaved = makeZotero10FeedView(null);
let originalHandleColumnSort = unsaved.view._handleColumnSort;
await context.patchWindow({ ZoteroPane: { itemsView: unsaved.view } });
assert.equal(unsaved.view.getSortField(), "date");
assert.equal(unsaved.view.getSortDirection(), -1);
assert.equal(unsaved.title.sortDirection, undefined);
assert.equal(unsaved.view.sortCalls, 1);

// Clicking a heading saves the direction even without existing settings
await unsaved.view._handleColumnSort.call(undefined, 0, -1);
assert.equal(unsaved.view._columnPrefs.title.dataKey, "title");
assert.equal(unsaved.view._columnPrefs.title.sortDirection, -1);
assert.equal(unsaved.view.getSortField(), "title");
assert.equal(unsaved.view.getSortDirection(), -1);

let saved = makeZotero10FeedView({ title: { sortDirection: 1 } });
await context.patchWindow({ ZoteroPane: { itemsView: saved.view } });
assert.equal(saved.view.getSortField(), "title");
assert.equal(saved.view.getSortDirection(), 1);

await context.shutdown({}, 0);
assert.equal(unsaved.view.getSortField(), "id");
assert.equal(unsaved.view.getSortDirection(), -1);
assert.equal(unsaved.view._handleColumnSort, originalHandleColumnSort);
assert.equal(unsaved.view._columnsId, null);

console.log("Zotero Feed Sort tests passed");
