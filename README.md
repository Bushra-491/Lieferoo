# Lieferoo – Last 100 m

A mobile web app for Lieferoo, a fictional food delivery app in Korea, so that a foreign customer's building entry details reach the Korean-speaking rider in a form they can read in 3 seconds.

**Live demo:** https://lieferoo.vercel.app/ (customer page: `/user.html`, rider page: `/rider.html`) · keep it live after the project ends
**Repository:** https://github.com/Bushra-491/Lieferoo
**Figma:** [paste the designer's link, or "Not received yet"] · **Team:** Team C (Koready 2Days Pilot) · **My role:** Developer

## Problem and solution

- **Problem:** Lieferoo's English app brought more orders from foreign residents, but also more failed and late deliveries. Customers write building, unit and door code in one English note, and Korean riders cannot read it quickly enough to get into the building.
- **Solution:** A customer picks an address, writes the building and unit in one field, picks how the rider gets in, and saves the order. The rider opens the same order and sees the road address, the building and unit as written, and a fixed Korean phrase for how to get in. Tapping "Delivered" changes the order status.

## Screenshots

[Add 2 images: the customer page with a saved order, and the rider page for the same order. Upload them in the repository and link them here.]

## How to run

**Live:** open the demo link above. No install is needed.

**Local (back end only):**

```bash
git clone https://github.com/Bushra-491/Lieferoo
cd Lieferoo
pip install -r requirements.txt
export DATABASE_URL="[your Neon connection string]"
python api/app.py     # API on http://localhost:5000
```

- Python 3 and a Neon (Postgres) database with the `orders` and `addresses` tables are needed.
- `DATABASE_URL` is set as an environment variable (in Vercel for the live site). It is never committed.
- The HTML pages are served by Vercel in production. Locally, only the API routes run.
- To load the sample addresses: set `DATABASE_URL`, then run `python seed_addresses.py`.

## Scope

**Built**
- Customer page (English): address picked from the sample list, one "Building and unit" field with the example `101동 1203호`, four entry methods, a door code field that shows only for "Door code", and a rider note with a 200-character counter
- Server-side checks with the PRD's error messages
- Rider page (Korean): road address, then the building and unit with the entry phrase, then the original note, then a "Delivered" button
- Status change from `delivering` to `delivered`
- Neon Postgres storage, so an order saved on one phone shows on another
- The 30 sample addresses loaded into Neon

**Not built (and why)**
- Translation of notes — closed in the PRD (no translation API)
- The 24 sample orders are **not loaded** into the database. Test orders were created using the entries in the sample-order.json file but it  was nit actually needed anywhere for the processing. 
- Preview screen (U3), address search, maps, payment, tracking — out of scope in the PRD

## Data

- **Sample data used:** `B1_sample_addresses.json` (30 addresses, loaded into the `addresses` table) · `B2_sample_orders.json` (used as a reference for field names and test input, not loaded)
- **Data changes (PRD v1.2, frozen):** the order gets three new fields next to the existing ones: `entry_method`, `entry_code`, `rider_note`. The detailed address is the existing one-line `detail` field. The old `building`, `floor` and `unit` columns exist in the table from an earlier version of the plan and are **unused**.

| Field | Type | Required | Rule | Max |
|---|---|---|---|---|
| `detail` | text | Yes | English letters, Korean syllables (가–힣), numbers and spaces only. Trimmed, then kept as written | 50 |
| `entry_method` | text | Yes | `door_code`, `call`, `security_desk` or `free` | – |
| `entry_code` | text | Only for `door_code` | Digits, `#` and `*` only. Stored empty for the other methods | 20 |
| `rider_note` | text | No | Free text, kept exactly as written (not trimmed) | 200 |
| `address_id` | text | Yes | Must exist in the `addresses` table | – |
| `status` | text | Set by the server | `delivering` (new order) → `delivered` | – |

Example order as returned by `GET /order?id=...`:

```json
{
  "order": {
    "order_id": "ORD-20261113-A1B2C3",
    "address_id": "ADR-001",
    "detail": "101동 1203호",
    "entry_method": "door_code",
    "entry_code": "1234#",
    "rider_note": "Please don't ring the bell",
    "status": "delivering",
    "road_address_ko": "서울특별시 마포구 성미산로17길 24"
  }
}
```

**Rider entry line:** `{detail} · {Korean phrase} {entry_code}`, with the code left out when empty.

| `entry_method` | Customer sees | Rider sees |
|---|---|---|
| `door_code` | Door code | 공동현관 비밀번호 |
| `call` | Call the unit at the entrance | 공동현관 호출 |
| `security_desk` | Ask at the security desk | 경비실 문의 |
| `free` | No code needed | 자유 출입 |

### API routes

| Route | What it does |
|---|---|
| `POST /orders` | Checks the input, saves a new order with status `delivering`, returns `order_id` (201) |
| `GET /order?id=...` | Returns one order with its road address (404 if not found) |
| `GET /addresses` | Returns the address list (optional `?q=` text filter) |
| `POST /deliver` | Sets the status to `delivered` and `delivered_at` |
| `GET /ping` · `GET /db-check` | Health checks for the server and the database |

### Decisions

- **Order ID format:** `ORD-YYYYMMDD-XXXXXX` (UTC date plus 6 random hex characters from Python's `secrets`).
- **Checks run on the server.** The page also sets a maximum length on each field, but the server is the one that decides. Only the **first** error is returned.
- **Messages follow PRD v1.2.** For limits and the address, which the PRD did not word: "Use up to 50/20/200 characters." (approved by the PM), "Select a valid delivery address." (no address chosen) and "Selected address does not exist." (unknown address).
- **Entry code is dropped** (stored empty) when the method is not `door_code`.
- **Double tap on "Delivered":** nothing changes, and the server answers "Already delivered."
- **Unknown order ID:** 404 with "Order not found."
- **New orders start as `delivering`,** because it is the only starting status in the sample data.
- **Addresses live in Neon, not in the function,** so the live site does not depend on a file inside the serverless function.

## Tech stack

| Area | Choice | Why |
|---|---|---|
| Language · framework | Python 3, Flask | Small, simple routes. Vercel runs Flask without extra setup. |
| Front end | Plain HTML, CSS and JavaScript | Two plain pages, no build step. The designer's screens replace the styling later. |
| Database | Neon Postgres | A shared store is needed so two phones see the same order. Free plan, connected through the Vercel Marketplace. |
| Backend | Python| I'm very much familiar with the python more than i familiar with any other language.|
| Hosting | Vercel | Listed in the Deploy Guide. One public https link for pages and API. |

**Tech constraint:** Vercel serverless functions keep no files between requests, so all saved data lives in Neon. The database address is an environment variable.

## Open-source libraries

| Library | Version | What we use it for | Why we chose it | Alternatives we considered |
|---|---|---|---|---|
| Flask | - | Routes and JSON responses | Smallest setup for a few routes | FastAPI: more setup and not needed for five routes |
| psycopg (`psycopg[binary]`) | - | Talks to Postgres | Current Postgres driver, installs without a compiler | psycopg2: older. SQLAlchemy: more than this project needs |

## My role and contribution

- **Built:** To setup the whole dev setup and environment including the repositories, neon database and vercel deployment. Then develop the whole  working backend and integrate the user and rider screens.
- **Decisions:** see the Decisions list in the Data section. Main one: one required `detail` field, as the PM changed it in PRD v1.2.
- **Hardest problem:** The hardest problem that I face during the whole project was to keep up with the timing for the tasks. It was a very rushed project so I didn't get the much time to review every step of mine thrice. But overall the project was really fun and a good experience.  

## AI usage

- I used Claude (an AI assistant) to understand the brief and PRD, plan the steps, review my code and tests, and help with parts of the code. I ran, tested and changed the code myself with the guidelines form the Gemini. 

## Known issues

- **Anyone with an order ID can open the rider page and see the door code.** There is no sign-in, and it is not hidden after delivery. Out of scope for this project.
- **English words can still reach the rider** (for example `Flat 2B` passes the character check). This is the PM's known risk in PRD v1.2.
- **The 24 sample orders are not in the database,** and sample values that contain blocked characters were not rewritten.
- **`lat` and `lng`** in the address list are returned as text, not numbers. Nothing uses them yet.
- **Plain styling:** this task uses default screens, not the designer's UI.
- **No order has a failed or late status,** because the sample data has only `delivering` and `delivered`.

## Team

| Role | Name | GitHub | What they built |
|---|---|---|---|
| Organizer | Koready | https://github.com/oinglab | Organized the whole project and made the team|
| Developer | Bushra Saleem | https://github.com/Bushra-491 | Dev Setup and Data Structure, User Screens build, Data flow and Order flow status, Rider Screen build and Integration|
| Developer | 전진영 | - | - |
| Designer | Anastasiia Slobodina | https://github.com/cinnamonn-designn | Current screen analysis and structure proposal (D0), PRD v1: flow and screens: review, User screens UI, Rider screens UI and design system, Final screens for marketing,
please update this into figma (PRD v1.2 updates) |
| Designer | Sienna |  | Core flow wireframes |
| PM | Charlotte | https://github.com/helloyeonni | PRD (v1.2), Kickoff note,  PRD v1: flow and screens, PRD updated v1.2, Final handoff |
