# Lieferoo – Last 100 m

A mobile web app for Lieferoo, a fictional food delivery app in Korea, so that foreign customers' address and delivery notes reach Korean-speaking riders in a form they can use.

**Live demo:** https://bushra-491.github.io/Lieferoo/ · keep it live after the project ends
**Figma:** Not received yet · **Team:** Team C (Koready 2Days Pilot) · **My role:** Developer

## Problem and solution

- **Problem:** Lieferoo's English app brought more orders from foreign residents, but also more failed and late deliveries. The screens are translated, but the address details and delivery notes reach Korean riders and shops exactly as the customer typed them.
- **Solution:** One flow that works end to end: the customer enters address details and a delivery note in English, and the rider sees what they need in Korean on one screen. This README covers Task 1 (dev setup and data structure). The data is loaded and checked, and the customer and rider screens come in the next tasks.

## Screenshots

The live demo shows 30 addresses, 24 orders, the data versions, and a green "Successfully connected to sample data!" message. I checked it in an incognito window.

## How to run

No install is needed. The page is plain HTML and JavaScript.

- Visit the live demo above, or
- Download the repository and open it through a local web server (for example `python -m http.server`), then go to `http://localhost:8000`. Opening `index.html` by double-click will not work, because the browser blocks loading the JSON files that way.

Environment variables: None.

## Scope

**Built**
- Repository, live deployment on GitHub Pages
- A page that loads `B1_sample_addresses.json` and `B2_sample_orders.json` and shows the number of addresses and orders and the data versions
- An error message if a data file fails to load

**Not built (and why)**
- Customer screen (English) — planned for the next task
- Rider screen (Korean) — planned for the next task
- Shared storage so the rider sees what the customer entered — needs a back end, planned for the next task
- Translation of free-text notes — optional in the brief, only after the core flow works
- Sign-up, payment, maps, address API — out of scope in the brief

## Data

- Sample data used: `B1_sample_addresses.json` · `B2_sample_orders.json` (kept unchanged, in the `data/` folder)
- Data changes: Added 6 new fields to the order, as planned by the PM. They sit next to the existing fields. No existing field is renamed or removed (the original `delivery_address.detail` stays for the old sample orders).

| New field | Type | Example | What it is |
|---|---|---|---|
| `building` | string | `Bldg 101` | Building inside the address (apartment block, villa A/B) |
| `floor` | string | `12F` | Floor |
| `unit` | string | `1203` | Unit or room number |
| `entry_method` | string (fixed list, draft) | `door_code` | How the rider gets in: `door_code`, `call_on_arrival`, `leave_at_door`, `guard` |
| `entry_code` | string or null | `4826#` | Door or gate code, if there is one |
| `rider_note` | string | `Don't ring the bell, baby sleeping` | Short extra note, kept as typed |

The `entry_method` list is a first draft. I will agree it with the designer, because it decides the Korean labels on the rider screen.

### Data structure draft

| Field | Type | Example |
|---|---|---|
| `order_id` | string | `HN-20261012-0001` |
| `status` | string | `delivering` |
| `app_language` | string | `en` |
| `delivery_address.address_id` | string | `ADR-002` |
| `delivery_address.building_name_ko` | string or null | `한빛마을2단지아파트` |
| `delivery_address.road_address_ko` | string | `서울특별시 마포구 동교로51길 10` |
| `delivery_address.detail` | string (as typed by the customer) | `1203, Bldg 101` |
| `delivery_address.location` | object (lat, lng) | `{ "lat": 37.56342, "lng": 126.92405 }` |
| `rider_request.preset` | string or null | `LEAVE_AT_DOOR_NO_RING` |
| `rider_request.text` | string (as typed by the customer) | `Gate code is 4826#. Please don't ring the bell, baby sleeping` |
| `store_request.text` | string | `Not too spicy please` |
| `store_request.no_cutlery` | boolean | `false` |

Example (shortened) from `HN-20261012-0001`:

    {
      "order_id": "HN-20261012-0001",
      "status": "delivering",
      "delivery_address": {
        "address_id": "ADR-002",
        "building_name_ko": "한빛마을2단지아파트",
        "detail": "1203, Bldg 101"
      },
      "rider_request": {
        "preset": "LEAVE_AT_DOOR_NO_RING",
        "text": "Gate code is 4826#. Please don't ring the bell, baby sleeping"
      }
    }

Things I noticed in the sample data that the design must handle:
- Customers write notes in several languages (English, Japanese, Chinese, Vietnamese) and sometimes Korean typed in English letters.
- Some notes put a food request (for example "no cilantro") in the rider note instead of the store note.
- `detail` is free text in many formats ("201号室", "Flat 2B", "Building B, 201").
- Some buildings have no name (`building_name_ko` is null), and some names are easy to confuse ("Green Ville" and "Green Ville 2", "Saebom Apt." and "Saebom Park Apt.").
- The sample has only two statuses, `delivering` and `delivered`.

## Tech stack

| Area | Choice | Why |
|---|---|---|
| Language · framework | HTML, CSS and JavaScript, no framework | The brief asks for a mobile web app. It is the fastest to deploy and needs no build step. |
| Styling | Plain CSS in `index.html` | Small page, no extra tools needed. |
| Hosting | GitHub Pages | Listed in the Deploy Guide as a free host for static sites. My Vercel deploy got stuck, so I switched. |

**Tech constraint:** A static site cannot share an order between the customer's phone and the rider's phone. A back end with shared storage is needed for the core flow. I am considering Python for it. This is not decided yet, and I will check what the free hosts support first.

## Open-source libraries

| Library | Version | What we use it for | Why we chose it | Alternatives we considered |
|---|---|---|---|---|
| None | — | — | — | — |

## My role and contribution

- **Built:** Repository, data folder, the data-loading page, and the live deployment on GitHub Pages.
- **Decisions:** Kept the sample files unchanged and with their original names. Started with a static page so the link was live early. Switched to GitHub Pages when the Vercel deploy got stuck.
- **Hardest problem:** The Vercel deploy got stuck close to the due time. I moved to GitHub Pages, which is allowed by the Deploy Guide, and checked the live link in an incognito window.

## AI usage

- I used Claude (an AI assistant) to understand the project brief and data spec, plan the steps and time, help me in writing the code (whish is improved by me after it) and review my work.

## Known issues

- The page card may be wider than a 375px phone screen. I have not checked or fixed this yet. Plan: add `max-width` and `box-sizing: border-box` to the card.
- The browser console shows a Content Security Policy `eval` warning in my normal browser. It did not appear to affect the page, and the page works in incognito.
- Customer screen, rider screen and shared storage are not built yet.

## Team

| Role | Name | GitHub | What they built |
|---|---|---|---|
| Developer | Bushra Saleem | @Bushra-491 | Task 1: repository, data loading page, deployment |
| Developer | Vaibhav Pol | — | — |
| Developer | 전진영 | — | — |
| Designer | Anastasiia Slobodina | — | — |
| Designer | Koready Designer | — | — |
| PM | Charlotte | — | — |
| Marketer | Hannah Roy | — | — |
