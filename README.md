# BFHL Node Analyzer

> SRM Full Stack Engineering Challenge — A graph/tree hierarchy analyzer with cycle detection.

## 🚀 Features

- **Edge Validation**: Validates `X->Y` format, catches invalid entries and self-loops
- **Duplicate Detection**: Identifies and reports duplicate edges
- **Tree Construction**: Builds nested hierarchies from valid edges
- **Cycle Detection**: DFS-based back-edge detection per connected component
- **Depth Calculation**: Computes longest root-to-leaf path
- **Beautiful Frontend**: Dark terminal-themed UI with animated graph background

## 📦 Tech Stack

| Layer    | Technology       |
|----------|-----------------|
| Backend  | Node.js, Express |
| Frontend | Vanilla HTML/CSS/JS |
| CORS     | cors middleware  |

## 🏃 Run Locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📡 API Documentation

### `POST /bfhl`

**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D", "C->E", "E->F", "X->Y", "Y->Z", "Z->X"]
}
```

**Response:**
```json
{
  "user_id": "Vansh_Gokhale",
  "college_email": "vg3778@srmist.edu.in",
  "personal_email": "vanshgokhale17@gmail.com",
  "college_roll_number": "RA2311003030289",
  "hierarchies": [
    { "root": "A", "tree": { "A": { "B": { "D": {} }, "C": { "E": {} } } }, "has_cycle": false, "depth": 3 },
    { "root": "X", "tree": {}, "has_cycle": true }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": { "total_trees": 1, "total_cycles": 1, "largest_tree_root": "A" }
}
```

### `GET /bfhl`

Returns `{ "operation_code": 1 }`.

## ☁️ Deploy to Render

1. Push this repo to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Deploy!

## 📁 Project Structure

```
/
├── server.js         ← Express API
├── package.json      ← Dependencies & scripts
├── public/
│   └── index.html    ← Frontend SPA
└── README.md         ← This file
```
