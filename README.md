# N-LAMS | National Land Acquisition & Management System

Demo-ready Smart India Hackathon 2026 prototype for a land acquisition command centre.

For the complete implementation explanation, read [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Install prerequisites

Install these on the new computer:

- Git
- Docker Engine
- Docker Compose (the `docker compose` plugin or Fedora's `docker-compose-switch`)
- Node.js 18 or newer and npm

On Fedora, Docker can be installed and started with:

```bash
sudo dnf install docker docker-compose-switch
sudo systemctl enable --now docker
```

If `docker compose version` works, use `docker compose` below. If only `docker-compose --version` works, replace `docker compose` with `sudo docker-compose`.

## 2. Download the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Hackathonprototype
```

## 3. Start the backend and PostGIS

```bash
sudo docker-compose down
sudo docker-compose up --build -d
```

The first build downloads the Python and PostGIS images and may take a few minutes. The backend source is copied into the image, so rerun `up --build -d` after backend changes.

Check that both services are running:

```bash
sudo docker-compose ps
curl http://localhost:8000/health
```

Expected health response:

```json
{"service":"N-LAMS","status":"operational"}
```

Seed the demo database:

```bash
sudo docker-compose exec backend python seed_data.py
```

This creates 18 contiguous Pune cadastral parcels and the first audit-ledger entry.

The PostGIS container is exposed on host port `5433` because port `5432` is commonly occupied by a local PostgreSQL installation. Inside Docker, the API still connects to `db:5432`.

## 4. Start the frontend

Open a second terminal:

```bash
cd Hackathonprototype/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Useful URLs:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:8000/health`
- Interactive API docs: `http://localhost:8000/docs`
- PostGIS from the host: `localhost:5433`

## 5. Stop or reset the demo

Stop containers but keep seeded data:

```bash
sudo docker-compose down
```

Stop containers and delete the database volume, which resets all data:

```bash
sudo docker-compose down -v
```

## Demo API flows

- `GET /api/gis/parcels` returns seeded WGS84 cadastral polygons.
- `POST /api/gis/corridor` buffers a proposed LineString, finds intersecting parcels with PostGIS `ST_Intersects`, clips affected geometries, and estimates compensation.
- `POST /api/compensation/calculate` applies the prototype RFCTLARR-style calculation.
- `GET /api/compensation/integrations` returns simulated PFMS, e-Courts, and DigiLocker statuses.
- `POST /api/monitor/change-detection` compares `before` and `after` images with OpenCV.
- `GET/POST /api/ledger/entries` reads and appends SHA-256 chained audit entries.

The frontend uses Esri World Imagery tiles, Leaflet, Lucide icons, and a deterministic local fallback dataset so the map remains explorable while the API is starting.