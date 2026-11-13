# Lieferoo – Last 100 m

A mobile web app for Lieferoo, a fictional food delivery app in Korea, so that a foreign customer's building entry details reach the Korean-speaking rider in a form they can read in 3 seconds.

**Live demo:** https://lieferoo.vercel.app/user.html (customer page) · rider page: `https://lieferoo.vercel.app/rider.html?id=<order id>` · keep it live after the project ends
**Repository:** https://github.com/Bushra-491/Lieferoo
**Figma:** https://www.figma.com/design/BsWwUvkdjNMdGhojh8fvGM/Lieferoo-%C2%B7-Team-C-%C2%B7-Entry-info-UI--Anastasiia-?node-id=17-170&p=f&t=rTSDniM28CJBwoQI- · **Team:** Team C (Koready 2Days Pilot) · **My role:** Developer

## Problem and solution

- **Problem:** Lieferoo's English app brought more orders from foreign residents, but also more failed and late deliveries. Customers write building, unit and door code in one English note, and Korean riders cannot read it quickly enough to get into the building.
- **Solution:** A customer picks an address, writes the building and unit in one field, picks how the rider gets in, and saves. A live preview shows what the rider will read. The rider opens the same order and sees a dark "도착지" block with the building and unit, a fixed Korean phrase (and the door code), and the original note. Tapping "배달 완료" changes the order status and hides the door code.

## Screenshots



## How to run

**Live:** open the demo link above. No install is needed.

**Local (API only):**

```bash
git clone https://github.com/Bushra-491/Lieferoo
cd Lieferoo
pip install -r requirements.txt
export DATABASE_URL="[your Neon connection string]"
python api/app.py     # API on http://localhost:5000
```

- Python 3 and a Neon (Postgres) database with the `orders` and `addresses` tables are needed.
- `DATABASE_URL` is an environment variable (set in Vercel for the live site). It is never committed.
- The HTML pages are served by Vercel in production.
- Load the sample addresses: set `DATABASE_URL`, then run `python seed_addresses.py`.
- Run the input-check tests: `python test_validate.py` (18 cases).

## Scope

**Built**
- **Customer page (English), following the designer's Address details screen:** address picker, "Building and unit" with the example `101동 1203호`, four entry-method cards, a door code field that shows only for "Door code", a rider note with a `0/200` counter, a live "Your rider will see" preview, and a "Save address" button that is disabled until the form is touched
- Inline error states with the PRD's messages, shown under the right field
- **Rider page (Korean), following the designer's R1 and R2:** "도착지" block, fixed Korean phrases, original customer note, "배달 완료" button, failure state with "다시 시도", and the done view
- Status change from `delivering` to `delivered`, and the door code is hidden after delivery (server)
- Neon Postgres storage, so an order saved on one device shows on another
- Server-side checks, and the 30 sample addresses loaded into Neon

**Not built (and why)** 
- Translation of notes: closed in the PRD
- The 24 sample orders are **not loaded** into the database. They were used as a reference for field names and test input.
- Address search, payment, tracking: out of scope in the PRD

## Data

- **Sample data used:** `B1_sample_addresses.json` (30 addresses, loaded into the `addresses` table; `sub_buildings` is stored as comma-separated text) · `B2_sample_orders.json` (reference for fields and test input, not loaded)
- **Data changes (PRD v1.2, frozen):** the order gets three new fields next to the existing ones: `entry_method`, `entry_code`, `rider_note`. The detailed address is the one-line `detail` field. The old `building`, `floor` and `unit` columns exist in the table from an earlier plan and are **unused**.

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

| `entry_method` | Customer sees (title · description) | Rider sees |
|---|---|---|
| `door_code` | Door code · Rider enters a code at the building door | 공동현관 비밀번호 |
| `call` | Intercom · Rider rings your unit at the entrance | 공동현관 호출 |
| `security_desk` | Security desk · Security staff let the rider in | 경비실 문의 |
| `free` | No code needed · No gate or door code | 자유 출입 |

### API routes

| Route | What it does |
|---|---|
| `POST /orders` | Checks the input, saves a new order with status `delivering`, returns `order_id` (201) |
| `GET /order?id=...` | Returns one order with its building and road address (404 if not found). The door code is empty once the order is delivered |
| `GET /addresses` | Returns the address list (optional `?q=` text filter) |
| `POST /deliver` | Sets the status to `delivered` and `delivered_at` |
| `GET /ping` · `GET /db-check` | Health checks for the server and the database |

### Decisions

- **Order ID format:** `ORD-YYYYMMDD-XXXXXX` (UTC date plus 6 random hex characters from Python's `secrets`).
- **The server decides.** The page also checks the same rules and sets a maximum length on each field. Only the **first** server error is returned.
- **Messages follow PRD v1.2.** Length messages ("Use up to 50/20/200 characters.") were approved by the PM. "Select a valid delivery address." and "Selected address does not exist." are my wording.
- **Entry code is dropped** (stored empty) when the method is not `door_code`.
- **Double tap on "Delivered":** nothing changes, and the server answers "Already delivered."
- **Door code is hidden after delivery,** as the spec board says.
- **Labels follow the designer's screens** (for example "Intercom"), and they map to the PRD's values (`call`).
- **Rider block order follows the designer's 도착지 block** (entry line first, road address last), as the PM confirmed.
- **Unknown order ID:** 404 with "Order not found." The rider page shows a Korean message (my wording, not in the design).
- **New orders start as `delivering`,** because it is the only starting status in the sample data.
- **Addresses live in Neon, not in the function,** so the live site does not depend on a file inside the serverless function.

## Tech stack

| Area | Choice | Why |
|---|---|---|
| Language · framework | Python 3, Flask | Small, simple routes. Vercel runs Flask without extra setup. |
| Front end | Plain HTML, CSS and JavaScript, Noto Sans KR from Google Fonts | Two pages, no build step. The font comes from the designer's spec board. |
| Database | Neon Postgres | A shared store is needed so two devices see the same order. Free plan, connected through the Vercel Marketplace. |
| Hosting | Vercel | Listed in the Deploy Guide. One public https link for pages and API. |

**Tech constraint:** Vercel serverless functions keep no files between requests, so all saved data lives in Neon. The database address is an environment variable.

## Open-source libraries

| Library | Version | What we use it for | Why we chose it | Alternatives we considered |
|---|---|---|---|---|
| Flask | not pinned | Routes and JSON responses | Smallest setup for a few routes | FastAPI: more setup and not needed for five routes |
| psycopg (`psycopg[binary]`) | not pinned | Talks to Postgres | Current Postgres driver, installs without a compiler | psycopg2: older. SQLAlchemy: more than this project needs |

## My role and contribution

- **Built:** the whole dev setup and environment (repository, Neon database, Vercel deployment), the working back end, and the customer and rider screens.
- **Decisions:** see the Decisions list in the Data section. Main one: one required `detail` field, as the PM changed it in PRD v1.2.
- **Hardest problem:** Hardest part was to setup the new account all other things were fine and I must say the deadlines were a lit too tight but it's all done in time so that's fine.

## AI usage

- I used Claude (an AI assistant) to understand the brief and PRD, plan the steps, review my code and tests, and help with parts of the code. I also used Gemini for guidance. I ran, tested and changed the code myself.
- The PRD's input rules became `validate_order`, which I test with 18 cases in `test_validate.py`.

## Known issues

- **Anyone with an order ID can open the rider page.** There is no sign-in. The door code is hidden after delivery, but visible before it. Out of scope for this project.
- **English words can still reach the rider** (for example `Flat 2B` passes the character check). This is the PM's known risk in PRD v1.2.
- **The 24 sample orders are not in the database,** and sample values with blocked characters were not rewritten.
- **`lat` and `lng`** in the address list are returned as text. Nothing uses them yet.
- **Client checks duplicate the server rules,** so a change to a rule must be made in both places.
- **No order has a failed or late status,** because the sample data has only `delivering` and `delivered`.

## Team

| Role | Name | GitHub | What they built |
|---|---|---|---|
| Organizer | Koready | https://github.com/oinglab | Organized the whole project and made the team |
| Developer | Bushra Saleem | https://github.com/Bushra-491 | Dev Setup and Data Structure, User Screens build, Data flow and Order flow status, Rider Screen build and Integration |
| Designer | Anastasiia Slobodina | https://github.com/cinnamonn-designn | Current screen analysis and structure proposal (D0), User screens UI, Rider screens UI and design system, Final screens for marketing |
| Designer | Sienna | https://github.com/sienna030 | Core flow wireframes, Analysis of the current screen and structural recommendations |
| PM | Charlotte | https://github.com/helloyeonni | Kickoff note, PRD v1, PRD v1.2, Final handoff |
