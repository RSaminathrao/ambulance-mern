# Geospatial Auto-Dispatch Worker (A*)

This module is a standalone background worker. It does not change existing UI or existing API modules.

## What it does
- Polls `Pending` ambulance requests.
- Finds `Available` drivers with matching ambulance type.
- Uses A* path search inside Tamil Nadu bounds to estimate nearest driver.
- Assigns the nearest driver by updating existing `AmbulanceRequest`, `Driver`, and `Trip` collections.
- Writes dispatch activity into `dispatchaudits`.

## New collections
- `driverlocations`
- `requestlocations`
- `dispatchaudits`

## Run
From `server`:

```bash
npm run dispatch:worker
```

## Environment
Uses `server/.env`:
- `MONGO_URI` (required)
- `DISPATCH_INTERVAL_MS` (optional, default `10000`)
- `DISPATCH_GRID_STEP` (optional, default `0.01`)
- `DISPATCH_MAX_REQUESTS` (optional, default `10`)

## Notes
- If location data is missing, deterministic fallback coordinates are auto-generated within Tamil Nadu bounds.
- Existing modules and UI logic remain unchanged.
