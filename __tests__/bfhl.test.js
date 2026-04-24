// Automated tests for the /bfhl endpoint using Jest and Supertest
const request = require('supertest');
const express = require('express');
let server;

beforeAll(() => {
  server = require('../server');
});

afterAll((done) => {
  if (server && server.close) server.close(done);
  else done();
});

describe('POST /bfhl', () => {
  it('should return correct hierarchy and issues for the provided test payload', async () => {
    const payload = {
      data: [
        'A->B', 'B->C', 'C->D', 'E->F', 'F->G', 'G->E', // cycle
        'A->B', // duplicate
        'X->Y', 'Y->Z', 'X->Z', // valid tree
        'M->M', // self-loop (invalid)
        'badformat', // invalid
      ]
    };
    const res = await request(server)
      .post('/bfhl')
      .send(payload)
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body).toHaveProperty('email_id');
    expect(res.body).toHaveProperty('college_roll_number');
    expect(res.body).toHaveProperty('hierarchies');
    expect(res.body).toHaveProperty('invalid_entries');
    expect(res.body).toHaveProperty('duplicate_edges');
    expect(res.body).toHaveProperty('summary');
    // Check for invalid entries
    expect(res.body.invalid_entries).toEqual(
      expect.arrayContaining(['M->M', 'badformat'])
    );
    // Check for duplicate edges
    expect(res.body.duplicate_edges).toEqual(
      expect.arrayContaining(['A->B'])
    );
    // Check for cycle detection
    expect(res.body.hierarchies.some(h => h.has_cycle)).toBe(true);
    // Check for hierarchies
    expect(Array.isArray(res.body.hierarchies)).toBe(true);
    // Check for summary
    expect(res.body.summary).toHaveProperty('total_trees');
    expect(res.body.summary).toHaveProperty('total_cycles');
    expect(res.body.summary).toHaveProperty('largest_tree_root');
  });
});

describe('POST /bfhl - edge cases and scenarios', () => {
  it('should handle empty input', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: [] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies).toEqual([]);
    expect(res.body.invalid_entries).toEqual([]);
    expect(res.body.duplicate_edges).toEqual([]);
    expect(res.body.summary.total_trees).toBe(0);
    expect(res.body.summary.total_cycles).toBe(0);
  });

  it('should handle only invalid input', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['bad', '1->2', 'A->A', '->', ''] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies).toEqual([]);
    expect(res.body.invalid_entries.length).toBe(5);
    expect(res.body.duplicate_edges).toEqual([]);
    expect(res.body.summary.total_trees).toBe(0);
    expect(res.body.summary.total_cycles).toBe(0);
  });

  it('should detect a simple cycle', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B', 'B->C', 'C->A'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies.length).toBe(1);
    expect(res.body.hierarchies[0].has_cycle).toBe(true);
    expect(res.body.summary.total_cycles).toBe(1);
  });

  it('should detect duplicate edges', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B', 'A->B', 'A->B'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate_edges).toEqual(['A->B']);
    expect(res.body.hierarchies.length).toBe(1);
  });

  it('should detect multi-parent and discard extra edges', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->C', 'B->C'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    // Only one parent edge for C should be kept
    expect(res.body.hierarchies.length).toBe(1);
    const kept = res.body.hierarchies[0].tree;
    expect(Object.keys(kept)).toContain('A');
    expect(Object.keys(kept)).not.toContain('B'); // B->C is discarded
  });

  it('should handle isolated nodes', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B', 'C->D'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies.length).toBe(2);
    expect(res.body.summary.total_trees).toBe(2);
  });

  it('should handle a single node (self-loop, invalid)', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->A'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.invalid_entries).toEqual(['A->A']);
    expect(res.body.hierarchies).toEqual([]);
  });

  it('should handle a single valid edge', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies.length).toBe(1);
    expect(res.body.summary.total_trees).toBe(1);
  });

  it('should handle a large valid tree', async () => {
    const edges = [];
    for (let i = 65; i < 90; i++) { // A->B->C->...->Z
      edges.push(String.fromCharCode(i) + '->' + String.fromCharCode(i + 1));
    }
    const res = await request(server)
      .post('/bfhl')
      .send({ data: edges })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.hierarchies.length).toBe(1);
    expect(res.body.summary.total_trees).toBe(1);
    expect(res.body.summary.largest_tree_root).toBe('A');
  });

  it('should handle only cycles', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B', 'B->C', 'C->A', 'D->E', 'E->D'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.summary.total_cycles).toBe(2);
    expect(res.body.hierarchies.every(h => h.has_cycle)).toBe(true);
  });

  it('should handle only trees', async () => {
    const res = await request(server)
      .post('/bfhl')
      .send({ data: ['A->B', 'B->C', 'D->E'] })
      .set('Accept', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body.summary.total_trees).toBe(2);
    expect(res.body.hierarchies.every(h => !h.has_cycle)).toBe(true);
  });
});
