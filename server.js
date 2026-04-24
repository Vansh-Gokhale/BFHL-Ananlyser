/**
 * BFHL Node Analyzer — Express REST API
 * POST /bfhl — Accepts edge strings, builds trees, detects cycles
 */
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Identity
const USER_ID = "Vansh_Gokhale";
const COLLEGE_EMAIL = "vg3778@srmist.edu.in";
const PERSONAL_EMAIL = "vanshgokhale17@gmail.com";
const COLLEGE_ROLL_NUMBER = "RA2311003030289";

const EDGE_RE = /^[A-Z]->[A-Z]$/;

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data))
      return res.status(400).json({ error: "'data' must be an array." });

    // Step 2 — Validate
    const valid = [], invalid_entries = [];
    for (const raw of data) {
      const t = String(raw).trim();
      if (!EDGE_RE.test(t) || t[0] === t[3]) { invalid_entries.push(raw); continue; }
      valid.push({ raw, norm: t, s: t[0], d: t[3] });
    }

    // Step 3 — Duplicates
    const seen = new Set(), dupSet = new Set(), unique = [];
    for (const e of valid) {
      if (seen.has(e.norm)) dupSet.add(e.norm);
      else { seen.add(e.norm); unique.push(e); }
    }
    const duplicate_edges = [...dupSet];

    // Step 4 — Build adjacency, enforce single-parent
    const adj = {}, parentOf = {}, allNodes = new Set(), childNodes = new Set(), kept = [];
    for (const e of unique) {
      allNodes.add(e.s); allNodes.add(e.d);
      if (parentOf[e.d] !== undefined) continue; // multi-parent discard
      parentOf[e.d] = e.s;
      childNodes.add(e.d);
      if (!adj[e.s]) adj[e.s] = [];
      adj[e.s].push(e.d);
      kept.push(e);
    }
    for (const n of allNodes) if (!adj[n]) adj[n] = [];

    // Union-Find for connected components
    const uf = {};
    const find = x => { if (!uf[x]) uf[x] = x; return uf[x] === x ? x : (uf[x] = find(uf[x])); };
    const unite = (a, b) => { uf[find(a)] = find(b); };
    for (const e of kept) unite(e.s, e.d);
    // ensure isolated nodes from discarded multi-parent edges are grouped
    for (const e of unique) unite(e.s, e.d);

    const comps = {};
    for (const n of allNodes) { const r = find(n); (comps[r] || (comps[r] = [])).push(n); }

    // Step 5-7 — Process each component
    const hierarchies = [];
    for (const nodes of Object.values(comps)) {
      const ns = new Set(nodes);
      // Find root
      let roots = nodes.filter(n => !childNodes.has(n));
      roots.sort();
      let root = roots.length ? roots[0] : [...nodes].sort()[0];

      // Cycle detection (DFS coloring)
      const W=0, G=1, B=2, col = {};
      nodes.forEach(n => col[n] = W);
      let cyc = false;
      const dfs = u => { col[u]=G; for(const v of adj[u]){ if(!ns.has(v))continue; if(col[v]===G){cyc=true;return;} if(col[v]===W){dfs(v);if(cyc)return;}} col[u]=B; };
      dfs(root);

      if (cyc) {
        hierarchies.push({ root, tree: {}, has_cycle: true });
      } else {
        const build = n => { const o={}; (adj[n]||[]).filter(c=>ns.has(c)).sort().forEach(c=>o[c]=build(c)); return o; };
        const depth = (function d(n){ const ch=(adj[n]||[]).filter(c=>ns.has(c)); return ch.length?1+Math.max(...ch.map(d)):1; })(root);
        hierarchies.push({ root, tree: { [root]: build(root) }, has_cycle: false, depth });
      }
    }

    // Sort: trees (desc depth) then cycles
    hierarchies.sort((a,b) => {
      if(a.has_cycle!==b.has_cycle) return a.has_cycle?1:-1;
      if(!a.has_cycle&&!b.has_cycle) return (b.depth-a.depth)||(a.root<b.root?-1:1);
      return 0;
    });

    // Step 8 — Summary
    const trees = hierarchies.filter(h=>!h.has_cycle);
    const cycles = hierarchies.filter(h=>h.has_cycle);
    let largest_tree_root = null;
    if (trees.length) {
      let mx = -1;
      for (const t of trees) {
        if (t.depth > mx || (t.depth === mx && t.root < largest_tree_root)) {
          mx = t.depth; largest_tree_root = t.root;
        }
      }
    }

    res.json({
      user_id: USER_ID, college_email: COLLEGE_EMAIL, personal_email: PERSONAL_EMAIL, college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies, invalid_entries, duplicate_edges,
      summary: { total_trees: trees.length, total_cycles: cycles.length, largest_tree_root }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/bfhl", (_req, res) => res.json({ operation_code: 1 }));

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 BFHL running on http://localhost:${PORT}`));
} else {
  module.exports = app;
}
