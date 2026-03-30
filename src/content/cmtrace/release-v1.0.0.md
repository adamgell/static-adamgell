---
title: "v1.0.0"
description: "First stable release — complete UX overhaul, eight themes, five new parsers, error intelligence, deployment workspace, diagnostics collection, and more."
date: 2026-03-28
draft: false
type: release
keywords:
  - release
  - v1.0.0
  - themes
  - parsers
  - error intelligence
  - deployment workspace
  - diagnostics collection
  - dsregcmd
  - dhcp
  - registry viewer
  - performance
---

First stable release. Since v0.5.0, CMTrace Open has received a complete UX overhaul with eight themes, a multi-tab file browser, dynamic parser-aware columns, five new log parsers, an embedded 411-code error intelligence layer, a Software Deployment analysis workspace, a Windows Diagnostics Collection tool, multi-file open and drag-drop, an inline Ctrl+F find bar, timezone-correct timestamps across all parsers, and deeper Windows Setup and DSRegCmd analysis.

## Workspaces

- **Software Deployment workspace** — Analyze a deployment folder (MSI, PSADT, WiX/Burn logs) in one click. Scans recursively, classifies each log's format and outcome, extracts exit codes, app name, version, deploy type, and timestamps. Deployment errors appear as rich cards with an "Open in Log Viewer" button that scrolls directly to the offending line.
- **Diagnostics Collection workspace** (Windows-only) — Concurrently collects 32 log patterns, 61 registry keys, 42 event log channels, 6 file exports, and 30 command outputs across Intune, Autopilot, Networking, Security, BitLocker, Windows Update, ConfigMgr, and general categories. Preset picker (Full / Intune+Autopilot / Networking / Security / Quick) and granular family-level tree for scoping.
- **DSRegCmd — MDM enrollment cross-reference** — Reads scheduled tasks under `\Microsoft\Windows\EnterpriseMgmt\` and cross-references GUIDs against enrollment registry keys. Eliminates false "enrollment missing" warnings.

## New Parsers

- **Windows DHCP Server** — Dedicated parser for `DhcpSrvLog-*.log` and `DhcpV6SrvLog-*.log` with IP Address, Host Name, and MAC Address columns.
- **macOS Intune MDM Daemon** — Parses pipe-delimited `/Library/Logs/Microsoft/Intune/IntuneMDMDaemon*.log`.
- **WiX/Burn bootstrapper** — Handles `[PID:TID][ISO-timestamp]` format logs (vc_redist, .NET runtime, etc.).
- **MSI verbose log** — Handles ~12 distinct line patterns including engine messages, action tracking, property dumps, and MainEngineThread return values.
- **PSADT Legacy** — Parses `[timestamp] [section] [source] [severity] :: message` logs from PSAppDeployToolkit v4.
- **Windows Registry export (.reg)** — Dedicated parser and regedit-style two-pane viewer with virtualized key tree for large files.

## Error Intelligence

- **Inline error code highlighting** — `0x`-prefixed codes are underlined in log entries. Selecting shows decoded description, category, and HRESULT facility breakdown.
- **411-code error database** — Covers Windows/Win32, HRESULT facilities, ConfigMgr client errors, and Windows Update agent codes.
- **Rebuilt Error Lookup dialog** — Fluent UI panel with live substring search, category badges, and lookup history.

## UI & Chrome

- **8 named themes** — Classic CMTrace, Dark, Light, Dracula, Nord, Solarized Dark, High Contrast, and Hotdog Stand.
- **Log file tabs** — Instant switching between open files with zero re-parse. Tab count in status bar.
- **Dynamic columns** — Auto-derived from detected parser. Resizable, reorderable, and persistent.
- **Collapsible sidebar** — Ctrl+B to toggle. State persists across sessions.
- **Inline find bar (Ctrl+F)** — Live search-as-you-type with hit count, regex mode, match case toggle, and Prev/Next navigation.
- **Font family picker** — Choose any system font in Accessibility settings.
- **Multi-file open** — Open multiple files via dialog, drag-drop, or CLI. Merged into a single aggregate view.

## Performance

- Zero-allocation severity detection via byte-level ASCII case folding.
- Cached thread display — ~15 allocations per file instead of ~30K.
- Batch folder parse via Rayon parallelism.
- In-memory tab cache for instant switching.
- GUID lookup optimization for DSRegCmd workspace.

## Notable Fixes

- IME 4-hour timestamp offset fixed — local time no longer treated as UTC.
- CCM/SCCM timezone offsets correctly applied.
- Tab strip overflow dropdown no longer clipped.
- Sidebar routing for Deployment and macOS workspaces.
- Row height calculation corrected for larger font sizes.
- macOS code signing and notarization for Gatekeeper compatibility.
