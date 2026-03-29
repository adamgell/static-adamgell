---
title: "v1.0.1"
description: "Fixes timezone display offset for cross-timezone logs and adds live date/time format refresh from Windows settings."
date: 2026-03-28
draft: false
type: release
---

## Fixed

- **Timestamp display offset** — Timestamps from logs written on machines in different timezones (e.g., UTC+8) now display correctly, matching the original CMTrace behavior. Previously, the app converted UTC epoch millis back to the viewer's local timezone, causing an 8-hour (or other) offset.
- **24h/12h time format refresh** — Date/time format preferences are now refreshed from the Windows registry when the app regains focus, so switching between 24-hour and AM/PM in Windows Settings takes effect without restarting the app.
