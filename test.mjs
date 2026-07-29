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

console.log("Zotero Feed Sort tests passed");
