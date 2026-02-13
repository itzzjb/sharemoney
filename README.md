# ShareMoney

A simple, privacy-first expense splitter for groups. Track shared expenses, split costs among any subset of participants, support multiple payers per expense, and get optimized settlement transactions — all in the browser with zero backend.

## Features

- **Multi-payer support** — A single expense can be paid by multiple people with different amounts
- **Flexible splitting** — Choose exactly who each expense is split among (not always everyone)
- **Optimized settlements** — Greedy algorithm minimizes the number of transactions needed
- **Rounding correction** — Handles penny rounding so balances always sum to zero
- **Balance chart** — Visual bar chart of who owes/is owed (powered by Chart.js)
- **Multi-currency** — Toggle between LKR (₨), USD ($), and EUR (€)
- **Inline editing** — Edit or delete entries and participants after adding them
- **Fully responsive** — Works on desktop, tablet, and phone (down to 360px)
- **No server, no signup** — 100% client-side, runs from a single HTML file

## Demo

Open `index.html` in any modern browser — no build step or server needed.

## Quick Start

```sh
git clone https://github.com/itzzjb/sharemoney.git
cd sharemoney
open index.html   # macOS
# or: xdg-open index.html (Linux) / start index.html (Windows)
```

## How It Works

1. **Add participants** — Enter names of people sharing expenses
2. **Add expenses** — For each expense, enter a description, total amount, who paid (and how much each), and who it should be split among
3. **Calculate** — Hit "Calculate Balances" to see each person's net balance and the minimum set of settlement transactions

### Settlement Algorithm

The app uses a greedy creditor/debtor matching approach:
- Compute each person's net balance (total paid − total owed)
- Apply rounding correction so balances sum to exactly zero
- Separate into creditors (+) and debtors (−)
- Iteratively match the largest debtor to the largest creditor until all debts are settled

This produces near-optimal results (minimum number of transactions for most real-world cases).

## Project Structure

```
sharemoney/
├── index.html        # Main app page
├── style.css         # Responsive styles (breakpoints at 700/480/360px)
├── app.js            # All application logic
├── tests.js          # 30-scenario test suite (run with Node.js)
├── LICENSE           # Apache 2.0
├── README.md
└── favicon_io/       # Favicon assets
    ├── favicon.ico
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    ├── about.txt
    └── site.webmanifest
```

## Running Tests

The test suite covers 30 scenarios including basic splits, multi-payer, rounding edge cases, circular debts, large groups, zero amounts, and more.

```sh
node tests.js
```

Expected output: `RESULTS: 165/165 passed, 0 failed`

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no framework, no build tools)
- [Chart.js](https://www.chartjs.org/) (CDN) for balance visualization

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
