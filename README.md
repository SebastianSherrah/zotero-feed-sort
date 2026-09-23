# Zotero Feed Sort

Zotero Feed Sort adds normal, clickable column sorting to RSS feed views in
Zotero 10.

## Why this exists

For some reason Zotero doesn't let you do this, I don't know why.

Zotero's **Settings → Advanced → Feeds → Sorting** option ("Newest items
first") does not sort by publication date.

This plugin enables the same familiar column-sorting behaviour in feed views
that Zotero already provides elsewhere.

## Requirements

- Zotero 10.0.x

The plugin has been tested with Zotero 10.0.4 on macOS. It should also work on
Windows and Linux, but this has not been tested. If it does not work for you,
please [open an issue](https://github.com/SebastianSherrah/zotero-feed-sort/issues).

For Zotero 9, use
[version 1.0.0](https://github.com/SebastianSherrah/zotero-feed-sort/releases/tag/v1.0.0).

## Install

1. Download the `zotero-feed-sort-*.xpi` file from the
   [latest release](https://github.com/SebastianSherrah/zotero-feed-sort/releases/latest).
2. In Zotero, open **Tools → Plugins**.
3. Open the tools menu and choose **Install Plugin From File…**.
4. Select the downloaded XPI file.

Zotero checks for plugin updates automatically. If you already have version
1.0.0 installed, Zotero offers version 1.1.0 once you are on Zotero 10.

## Privacy and library safety

The plugin code does not make its own network requests, collect telemetry, or
modify library items, feed subscriptions, or the Zotero database. It changes
the item table's sorting behaviour in memory and uses Zotero's normal
column-preference storage. Zotero may contact GitHub when checking for plugin
updates.

## Compatibility

The plugin modifies internal Zotero interface behaviour, so a future Zotero
release may require a compatibility update.

This is an independent plugin and is not affiliated with the Zotero project.

## Remove

Open **Tools → Plugins**, find **Zotero Feed Sort**, open **More Options**, and
choose **Remove**. Zotero's original feed ordering will be restored.

## Licence

Zotero Feed Sort is available under the [MIT Licence](LICENSE).
