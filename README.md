# Zotero Feed Sort

Zotero Feed Sort adds normal, clickable column sorting to RSS feed views in
Zotero 9.

Feed entries are initially sorted by publication date, newest first. Click the
**Date** heading to reverse the order. The arrow beside the heading shows the
current direction. Other visible column headings can also be used for sorting.

## Why this exists

Zotero displays a date for each feed entry, but its feed views normally follow
the entries' internal order and disable column sorting. If a publisher supplies
items in an inconsistent order, the resulting feed can appear scrambled.

This plugin enables the same familiar column-sorting behaviour in feed views
that Zotero already provides elsewhere.

## Requirements

- Zotero 9

The plugin has been tested with Zotero 9.0.6 on macOS. It should work on other
desktop platforms supported by Zotero, but I don’t know if it does. If it doesn’t you can raise an issue.

## Install

1. Download the `zotero-feed-sort-*.xpi` file from the
   [latest release](https://github.com/SebastianSherrah/zotero-feed-sort/releases/latest).
2. In Zotero, open **Tools → Plugins**.
3. Open the tools menu and choose **Install Plugin From File…**.
4. Select the downloaded XPI file.

## Use

Select any source under **Feeds**, then click a column heading:

- **Date ↓** sorts from newest to oldest.
- **Date ↑** sorts from oldest to newest.
- **Title** and **Creator** can also be sorted in either direction.

The selected direction is shared across feed views.

## Privacy and library safety

The plugin code does not make its own network requests, collect telemetry, or
modify library items, feed subscriptions, or the Zotero database. It changes
the item table's sorting behaviour in memory and uses Zotero's normal
column-preference storage. Zotero may contact GitHub when checking for plugin
updates.

## Compatibility

The plugin supports Zotero 9.x. It modifies internal Zotero interface behaviour,
so a future major Zotero release may require a compatibility update.

This is an independent plugin and is not affiliated with the Zotero project.

## Remove

Open **Tools → Plugins**, find **Zotero Feed Sort**, open **More Options**, and
choose **Remove**. Zotero's original feed ordering will be restored.

## Build from source

Building requires Node.js and the `zip` command:

```sh
./build.sh
```

The script checks the JavaScript and manifest, runs the tests, and creates the
XPI in `dist/`.

## Licence

Zotero Feed Sort is available under the [MIT Licence](LICENSE).
