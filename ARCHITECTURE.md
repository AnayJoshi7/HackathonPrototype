# N-LAMS Prototype: Simple Technical Explanation

## 1. What the prototype does

N-LAMS demonstrates this flow:

```text
User draws a road corridor
        ↓
The API checks which cadastral parcels intersect it
        ↓
The system clips those parcels and calculates compensation
        ↓
The UI shows landholders, values, and affected areas
        ↓
Simulated government checks and an audit hash are available
```

The prototype is intentionally small. It proves the main workflow without requiring real government credentials, real payment access, or a production survey-data pipeline.

## 2. Repository structure

```text
N-LAMS/
├── docker-compose.yml          Starts PostGIS and the FastAPI API
├── README.md                   Setup and run instructions
├── ARCHITECTURE.md             This technical explanation
├── backend/
│   ├── Dockerfile              Builds the API image
│   ├── requirements.txt        Python dependencies
│   ├── seed_data.py            Creates 18 demo parcels
│   └── app/
│       ├── main.py             FastAPI application and startup
│       ├── config.py           Environment configuration
│       ├── db.py               SQLAlchemy engine and sessions
│       ├── models.py            Parcel and ledger database models
│       ├── schemas.py           Request and response validation
│       ├── routers/
│       │   ├── gis.py           Parcel and corridor endpoints
│       │   ├── compensation.py  Valuation and integration stubs
│       │   ├── monitor.py       OpenCV change detection
│       │   └── ledger.py         Audit-ledger endpoints
│       └── services/
│           ├── compensation.py  Compensation calculation
│           └── ledger.py         Hash-chain writing logic
└── frontend/
    ├── package.json             React and frontend dependencies
    ├── vite.config.js           Vite configuration
    └── src/
        ├── main.jsx             React application and map interactions
        └── styles.css            Operational console styling
```

## 3. Technology choices

### Docker Compose

Docker Compose runs the database and API in repeatable containers. This means another computer does not need a manually configured Python environment or PostGIS installation.

### PostgreSQL + PostGIS

PostgreSQL stores parcel attributes. PostGIS adds spatial types and functions, which are necessary for questions such as “which parcels intersect this corridor?” A normal SQL database would make this much harder and less reliable.

The database service is:

- Database: `nlams`
- User: `nlams`
- Password: `nlams_dev`
- Container port: `5432`
- Host port: `5433`

The host port is `5433` to avoid conflicts with a local PostgreSQL server. Docker services still use the internal address `db:5432`.

### FastAPI

FastAPI provides small, typed HTTP endpoints and automatically generates `/docs`. It was chosen because it is quick to build, easy to demonstrate, and works naturally with Python GIS and computer-vision libraries.

### SQLAlchemy and GeoAlchemy2

SQLAlchemy maps Python classes to database tables. GeoAlchemy2 adds PostGIS geometry support. The `Parcel` model contains normal fields such as `owner_name` and `circle_rate`, plus a WGS84 polygon geometry.

### Pydantic schemas

Pydantic validates API requests before business logic runs. For example, a corridor must contain at least two coordinates and its width must be positive. This keeps invalid demo requests from reaching the spatial query.

## 4. Database model

### `parcels`

Each parcel contains:

- `khasra_no`: cadastral identifier
- `owner_name`: demo landholder
- `land_type`: agricultural, residential, orchard, or barren
- `circle_rate`: demo market rate per square metre
- `area_sq_m`: calculated parcel area
- `district`: demo district, Pune
- `geometry`: PostGIS polygon in EPSG:4326 / WGS84

### `ledger_entries`

Each audit entry contains:

- Event type
- JSON payload
- Current SHA-256 hash
- Previous entry hash
- Timestamp

The previous hash links every entry to the one before it. Changing an old entry would break the chain from that point onward. This is a simulated tamper-evident ledger, not a blockchain network.

## 5. Seed data

`backend/seed_data.py` creates 18 parcels in a 6-by-3 grid. Each polygon is contiguous with its neighbours and receives realistic demo attributes. Shapely creates the polygons, while GeoAlchemy2 converts them to PostGIS-compatible WKT.

The seed script first clears old parcels and ledger entries. This makes repeated demo resets predictable. It then writes a `SEED_DATASET_CREATED` ledger entry.

## 6. GIS workflow

The main endpoint is `POST /api/gis/corridor`.

1. The frontend collects map clicks as longitude/latitude pairs.
2. It sends those points and a corridor width to FastAPI.
3. The backend creates a LineString.
4. The LineString is buffered into an approximate corridor polygon.
5. PostGIS runs `ST_Intersects` against parcel geometries.
6. For each match, Shapely calculates the clipped geometry.
7. The clipped fraction is applied to the parcel's stored area.
8. The compensation service calculates an estimate for that affected area.
9. The API returns the corridor, clipped parcels, and total compensation.

The current demo uses a degree-based buffer approximation for speed and simplicity. A production system should transform geometries into a local projected CRS, use survey-grade source data, and apply a legally approved acquisition boundary.

## 7. Compensation workflow

The prototype calculation is in `backend/app/services/compensation.py`:

```text
multiplied value = market value × rural multiplier
solatium = multiplied value × solatium rate
total = multiplied value + solatium + assets + rehabilitation allowance
```

The default demo values are:

- Rural multiplier: `2.0`
- Solatium: `100%`
- Asset value: `0`
- Rehabilitation allowance: `0`

This is a simplified RFCTLARR-style demonstration. Actual awards depend on location, notification date, land category, assets, rehabilitation rules, statutory authorities, and current government notifications. The prototype must not be treated as a legal award calculator.

## 8. Simulated government integrations

`GET /api/compensation/integrations` returns fixed demo statuses:

- PFMS: ready for disbursement
- e-Courts: litigation check clear
- DigiLocker: KYC verified

These are intentionally stubs. There are no real credentials, external calls, or payments. In a production system, each would be placed behind an adapter with authentication, retries, consent, audit logging, and reconciliation.

## 9. Computer vision monitoring

`POST /api/monitor/change-detection` accepts two uploaded images:

1. Decode both files with OpenCV.
2. Convert them to grayscale.
3. Resize the second image to the first image's dimensions.
4. Calculate absolute pixel differences.
5. Apply a threshold of `35`.
6. Remove small noise with morphological opening.
7. Return changed-pixel count and changed percentage.

This proves the endpoint and processing pipeline. A production monitoring service would also need image registration, cloud masking, orthorectification, seasonal normalization, confidence scoring, and polygon output for detected encroachments.

## 10. Audit ledger

When an entry is appended, the service:

1. Reads the latest entry hash.
2. Canonicalizes the new JSON payload.
3. Combines the previous hash, event type, payload, and timestamp.
4. Calculates a SHA-256 digest.
5. Stores the new entry with the previous hash.

This gives the demo an easy-to-understand integrity trail. It provides tamper evidence, not independent consensus or legal non-repudiation.

## 11. Frontend implementation

The frontend is a React 18 application built with Vite.

- `MapContainer` creates the Leaflet map.
- `TileLayer` loads Esri World Imagery tiles.
- `GeoJSON` renders parcel polygons.
- `Polyline` renders the proposed corridor.
- Map clicks append corridor coordinates.
- Parcel clicks update the inspector panel.
- `fetch` calls the FastAPI endpoints.
- Lucide React provides consistent interface icons.
- CSS creates the split-view command-centre layout.

The UI includes a local fallback dataset. This is useful during a presentation because the map and inspector still render if the API is temporarily unavailable. Once the API responds, the frontend replaces the fallback parcels with database data.

## 12. End-to-end demo sequence

1. Start Docker and the two Compose services.
2. Seed the database.
3. Start Vite.
4. Open the frontend.
5. Click parcels to inspect ownership and value.
6. Click `DRAW CORRIDOR`, then click map points.
7. Click `RUN ANALYSIS`.
8. The API finds intersecting parcels and returns affected areas.
9. The UI highlights affected parcels and updates the liability estimate.
10. Use `/docs` to demonstrate compensation, monitoring, integration, and ledger endpoints.

## 13. Prototype limitations and next production steps

- Replace generated polygons with authoritative cadastral data.
- Use a projected CRS and geodesic/engineering corridor widths.
- Add database migrations with Alembic.
- Add authentication and role-based access control.
- Add real government integration adapters only after official access is approved.
- Store original evidence files and model/version metadata.
- Add automated tests for spatial intersections, compensation rules, and ledger verification.
- Add monitoring dashboards and immutable evidence retention.
- Use a real transaction/audit service if legal non-repudiation is required.