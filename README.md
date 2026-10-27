# equipdesk-api

Industrial supply equipment and order management REST API built with Node.js, Express, and MySQL.

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /health | Health check status |
| GET | /api/equipment | List all equipment |
| GET | /api/equipment/:id | Get equipment by ID |
| POST | /api/equipment | Create equipment (name, category, quantity, price) |
| PUT | /api/equipment/:id | Update equipment by ID |
| DELETE | /api/equipment/:id | Delete equipment by ID |
| GET | /api/orders | List all orders |
| GET | /api/orders/:id | Get order by ID |
| POST | /api/orders | Create order (equipmentId, quantity, status) & decrement stock |
| PUT | /api/orders/:id | Update order fields |
| DELETE | /api/orders/:id | Delete order by ID |

## MySQL Setup via Docker

Run a local MySQL container:

```bash
docker run -d \
  --name equipdesk-mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=equipdesk \
  -p 3306:3306 \
  mysql:8
```

Apply the database schema:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -psecret equipdesk < schema.sql
```

Set environment variables:

```bash
export MYSQL_HOST=127.0.0.1
export MYSQL_USER=root
export MYSQL_PASSWORD=secret
export MYSQL_DATABASE=equipdesk
export PORT=3000
```

## Running the Server

```bash
npm install
npm start
```

If `MYSQL_HOST` is not set, the application automatically uses the in-memory store.

## Running Tests

Tests run against an in-memory store and do not require MySQL:

```bash
npm test
```
