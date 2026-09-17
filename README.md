# Saffron & Sage — Restaurant Management Platform

A full-stack restaurant management application: customers browse a menu that changes every
day and order from it, the kitchen works a live board, and the owner runs the business from
a dashboard.

**React 19 · ASP.NET Core 10 · SQL Server · EF Core 10 · JWT · SignalR**

---

## What it does

### Customers
Browse today's menu — the dishes the chef actually planned for today, nothing else — search
and filter by category, view a dish, build a cart, check out as dine-in / takeaway / delivery,
then watch the order move through the kitchen in real time. No account needed to browse. Full
order history with receipts.

### Chefs & staff
A live kitchen board with three columns matching the order lifecycle — new tickets appear
without a refresh, and each column has one primary action. Plus the **daily menu planner**,
which *is* the menu: customers can only see and order what the kitchen scheduled for that
day, in the quantity and at the price it chose.

### Admins
Everything staff can do, plus a dashboard (revenue trend, orders per day, status split, best
sellers, revenue by category) and full management of menu items, categories, orders and users.

---

## Running it

**Prerequisites:** .NET 10 SDK, Node 20+, and SQL Server (LocalDB, Express or full).

```bash
cd backend/src/Restaurant.Api && dotnet run
```

The API starts on `http://localhost:5088`, creates the database, applies migrations and seeds
demo data on first run. Swagger UI is at `/swagger`.

```bash
cd frontend && npm install && npm run dev
```

The app is at `http://localhost:5173`. Vite proxies `/api` and `/hubs` to the backend, so the
browser only ever talks to one origin.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@restaurant.com` | `Admin@123` |
| Chef (staff) | `chef@restaurant.com` | `Chef@1234` |
| Customer | `customer@restaurant.com` | `Customer@123` |

The seeder creates a full catalogue, three weeks of daily menus and two weeks of order
history, so the dashboard charts and kitchen board have real content immediately.

### Configuration

Defaults live in `backend/src/Restaurant.Api/appsettings.json`:

- `ConnectionStrings:DefaultConnection` — defaults to LocalDB. Point it at SQL Server Express
  with `Server=.\SQLEXPRESS;Database=RestaurantDb;Trusted_Connection=True;TrustServerCertificate=True`.
- `Restaurant` — tax rate, delivery fee, free-delivery threshold, order limits, timezone.
- `Jwt:SigningKey` — **empty by default and the app refuses to start without it.** Development
  supplies one via `appsettings.Development.json`; anything real must use user-secrets or the
  `Jwt__SigningKey` environment variable.
- `SeedDemoData` — set to `false` to start with an empty database.

---

## Architecture

```
backend/
  src/Restaurant.Domain/          Entities, enums, the order state machine
  src/Restaurant.Application/     DTOs, services, validators — the business logic
  src/Restaurant.Infrastructure/  EF Core, migrations, seeding, JWT, password hashing
  src/Restaurant.Api/             Controllers, middleware, SignalR hub, DI wiring

frontend/src/
  components/ui/                  Button, Field, Modal, DataTable, states — the design system
  components/layout/              Public shell and dashboard shell
  pages/                          One folder per audience: public, auth, customer, staff, admin
  services/                       One module per API area
  context/ hooks/ lib/            Auth + cart state, shared hooks, formatting and constants
```

Dependencies point inward: `Api → Infrastructure → Application → Domain`. The Application
layer talks to the database through `IApplicationDbContext`, so it never references EF Core's
SQL Server provider or the Infrastructure project.

### Decisions worth explaining

**No repository layer.** `DbSet<T>` is already a repository and `IQueryable` already composes.
Wrapping it would have added a layer without adding capability. Services take
`IApplicationDbContext` instead — the seam that actually matters is the one between the
business logic and the database *provider*, and that interface provides it.

**Roles are an enum, not a table.** The brief listed `Roles` as an entity, but there are
exactly three, the code branches on them directly, and they never change at runtime. An enum
column with a `CHECK` constraint gives the same integrity with no join on every user query,
and makes `UserRole.Admin` a compile-time symbol rather than a magic id.

**The cart lives in the browser.** A restaurant cart is short-lived and personal, so persisting
it server-side would mean a write on every tap for no benefit. What matters is that the client
never decides money: `POST /api/orders/preview` re-prices the cart server-side, and checkout
prices it again from the live menu. Prices in the cart UI are a preview, never an input.

**Menu items are soft-deleted.** Historical orders reference them. Deleting rows would break
order history and every revenue report, so a deleted dish is archived — it vanishes from menus
and future schedules while past orders stay intact. A filtered unique index keeps live dish
names unique without archived rows blocking name reuse.

**The service date comes from the server.** The client must not derive "today" from the browser
clock — a customer past midnight locally, or in another timezone, would label and cache the
menu against a day the kitchen isn't serving. `GET /api/restaurant` returns the authoritative
service date, and the UI uses it for every date label and for expiring stale carts.

---

## The daily menu

The core feature, and the rule the whole product is built around:

> **A customer can only see and order the dishes the kitchen put on that day. Nothing appears
> on its own.**

The catalogue (`MenuItem`) is what the kitchen *can* cook. The plan (`DailyMenuItem`) is what
it *is* cooking on a given date, and carries that day's portion count, optional promotional
price and sold-out flag. A dish reaches a customer only when a plan row exists for the date —
so the planner is the single source of truth for what is for sale, and the chef can never be
asked for something they didn't prepare.

That rule is a single inner join in `MenuService.BuildMenuQuery`, and both the customer menu
and order pricing go through it — so what a customer is shown and what they are charged can
never drift apart. Removing a dish from a day's plan removes it from the menu and rejects it
at checkout in the same instant.

`MenuAvailability` does **not** override this. It only describes how a dish is planned and
presented:

- **Everyday staple** — part of the regular menu. The planner's *Add staples* button puts every
  staple on a day in one click, so applying the rule strictly doesn't become daily busywork.
- **Chef's special** — picked for particular days, and badged as today's special on the menu.

An admin can still pull any dish everywhere at once with the `IsAvailable` switch, which
overrides the plan — useful when an ingredient runs out mid-service.

Beyond the brief, the planner also supports:

- **One-click day fill.** *Add staples* schedules every everyday dish that isn't on the day yet;
  *Copy day* duplicates a previous day's whole plan.

- **Per-day pricing.** A dish can be discounted for one date; the customer menu shows the
  original struck through. This is what "dish of the day" usually means commercially.
- **Portion counts that actually deplete.** Ordering decrements the day's stock, cancelling
  returns it, and a dish auto-disappears at zero. `DailyMenuItem` carries a `rowversion`, so
  two customers racing for the last portion produce a clean 409 rather than an oversell.
- **Copy a day onto other dates.** "Same as last Friday" is the most common planning action.
  Rows with sales are never overwritten.

Guardrails: past dates can't be edited, a dish can't be scheduled twice on one day (enforced by
a unique index, not a check-then-insert race), quantity can't drop below what's already sold,
and a dish with sales can't be removed — it's marked sold out instead, which stops new orders
without erasing the day's record.

---

## Security

- **Passwords** — PBKDF2-HMAC-SHA256, 210,000 iterations, per-password random salt, fixed-time
  comparison. The iteration count is stored with the hash so it can be raised later without
  invalidating existing passwords.
- **Tokens** — 15-minute access tokens; refresh tokens are rotated on every use, so a stolen one
  is usable at most once. Changing a password or deactivating an account revokes every live
  session immediately rather than waiting for expiry.
- **Authorization** — role checks come from the signed token. Public registration always creates
  a Customer, so the sign-up form cannot escalate privileges; staff and admin accounts are
  created by an admin. Customers scoped to their own orders get `404`, not `403`, so order ids
  can't be probed. Route guards in React are a usability layer only — every endpoint authorizes
  independently.
- **Input** — FluentValidation runs before every action via a filter. Sort keys are whitelisted
  rather than interpolated. The last active admin can't be demoted or deactivated.
- **Errors** — one middleware maps exceptions to consistent ProblemDetails. Stack traces are
  only ever exposed in Development.

---

## Order lifecycle

```
New ──► Preparing ──► Ready ──► Completed
 └──────────┴───────────┴────► Cancelled
```

`OrderStatusTransitions` in the Domain layer is the only definition of what's legal, and both
the API and the UI read from it — the kitchen board renders exactly the buttons the server
would accept. Every transition is appended to `OrderStatusHistory` with who made it and when.
Cancelling returns reserved portions to the day's menu. Customers can only cancel while an
order is still `New`; after that it's a staff decision.

Order totals are calculated once, in `OrderPricing`, shared by the cart preview and by
checkout. Placing an order runs in a transaction; `Order` carries a `rowversion` so two staff
members editing one order produce a conflict instead of a silent overwrite.

---

## API

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register\|login\|refresh\|logout\|change-password`, `GET\|PUT /api/auth/me` |
| Public menu | `GET /api/menu`, `/api/menu/{id}`, `/api/menu/specials`, `/api/restaurant`, `/api/categories` |
| Catalogue (admin) | `GET\|POST\|PUT\|DELETE /api/menu-items`, `PATCH /api/menu-items/{id}/availability`, `/api/categories` CRUD |
| Daily menu (staff) | `GET /api/daily-menus`, `/calendar`, `POST /api/daily-menus`, `PUT\|DELETE /{id}`, `PATCH /{id}/sold-out`, `POST /staples`, `POST /copy` |
| Orders | `POST /api/orders/preview`, `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders` (staff), `GET /{id}`, `PATCH /{id}/status`, `POST /{id}/cancel` |
| Users (admin) | `GET /api/users`, `POST /api/users/staff`, `PATCH /{id}/role`, `PATCH /{id}/status` |
| Dashboard (admin) | `GET /api/dashboard/overview` |
| Realtime | `/hubs/orders` — `OrderPlaced`, `OrderStatusChanged` |

Menu items, orders and users are all paginated, searchable, filterable and sortable; page size
is clamped server-side so no client can ask for everything.

### Real-time

The hub requires authentication and derives group membership from the token: staff and admins
join a kitchen group and see every order, customers join a group of their own and receive only
their own. Broadcast failures are logged and swallowed — a dropped websocket must never roll
back a committed order, and the UI falls back to normal refetching.

---

## Notes

The dashboard aggregates entirely in SQL — no order rows are pulled into memory to be summed.
The staff workspace is lazy-loaded, so a customer browsing the menu never downloads the
charting library (main bundle 426 kB, dashboard chunk 403 kB loaded only for admins).

Migrations are applied at startup for convenience; a production deployment would run them as a
separate controlled step.

Seed images are hosted on Unsplash. `DishImage` falls back to a branded tile when an image is
missing or fails to load, so the UI degrades gracefully offline.
