---
title: "v1.0.2"
description: "Adds in-app auto-update checking, improves app quality and performance, and hardens security and CI reliability."
date: 2026-03-30
draft: false
type: release
keywords:
  - release
  - v1.0.2
  - updater
  - tauri
  - performance
  - security
  - accessibility
---

## Added

- **Auto-update checking** - The app now checks for new releases on startup and displays an in-app update prompt when a newer version is available. Updates can be downloaded and installed without leaving the app. Powered by `tauri-plugin-updater` and `tauri-plugin-process`.

## Improved

- **App icon** - Replaced logo with a simplified flame icon on a transparent background for cleaner appearance across platforms.
- **Codebase quality** - Migrated 20 internal helper functions from `Result<_, String>` to typed `AppError`, consolidated all `eprintln`/`println` calls to `log::` macros, migrated 23 files from `once_cell::sync::Lazy` to `std::sync::OnceLock`, and decomposed large UI components (`getFactGroups`, `NewIntuneWorkspace`, `EvidenceBundleDialog`) into focused modules.
- **Performance** - Extracted and memoized `EventTimelineRow` component to reduce unnecessary re-renders in the Intune timeline.

## Fixed

- **Duration display bug** - Fixed incorrect duration calculation in timeline views.
- **Accessibility** - Improved color contrast and focus indicators across dark theme components.
- **Path traversal hardening** - Added validation to prevent path traversal in file handling.
- **CSS alpha values** - Fixed invalid CSS alpha channel values in several theme tokens.
- **CI configuration** - Updated `cargo-deny` config for v0.16+ and v0.17+ compatibility, added missing permissive licenses to the allow list, and suppressed unmaintained-crate advisories from Tauri transitive dependencies.
