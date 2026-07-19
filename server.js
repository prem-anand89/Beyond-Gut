const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { clerkMiddleware, requireAuth } = require('@clerk/express');

// Optional: only load pg if DATABASE_URL is set
let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const { v4: uuidv4 } = require('uuid');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Initialize database (optional)
async function initializeDatabase() {
  if (!pool) {
    console.log('⚠️  DATABASE_URL not set. Running in localStorage mode.');
    console.log('   To enable cloud sync, set DATABASE_URL in Railway environment variables.');
    return;
  }

  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_org_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        patient_name VARCHAR(255),
        visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answers JSONB,
        extras JSONB,
        score_snapshot JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
    console.error('⚠️  Continuing without database. API endpoints will not be available.');
  }
}

// Middleware: check if database is available for API calls
function requireDatabase(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: 'Database not configured',
      message: 'Cloud visit sync is not enabled. Set DATABASE_URL in environment variables to enable it.',
      fallback: 'Using browser localStorage for visits'
    });
  }
  next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'not configured',
    auth: 'clerk enabled'
  });
});

// Protected API endpoints
app.post('/api/visits', requireAuth(), requireDatabase, async (req, res) => {
  try {
    const { answers, extras, scoreSnapshot, patientName } = req.body;
    const userId = req.auth.userId;
    const orgId = req.auth.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'No organization associated with user' });
    }

    // Get or create organization
    let orgResult = await pool.query(
      'SELECT id FROM organizations WHERE clerk_org_id = $1',
      [orgId]
    );

    let dbOrgId;
    if (orgResult.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO organizations (clerk_org_id, name) VALUES ($1, $2) RETURNING id',
        [orgId, `Organization ${orgId}`]
      );
      dbOrgId = insertResult.rows[0].id;
    } else {
      dbOrgId = orgResult.rows[0].id;
    }

    // Save visit
    const visitId = uuidv4();
    await pool.query(
      `INSERT INTO visits (id, organization_id, user_id, patient_name, answers, extras, score_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [visitId, dbOrgId, userId, patientName, JSON.stringify(answers), JSON.stringify(extras), JSON.stringify(scoreSnapshot)]
    );

    res.json({ id: visitId, message: 'Visit saved successfully' });
  } catch (err) {
    console.error('Save visit error:', err);
    res.status(500).json({ error: 'Failed to save visit' });
  }
});

app.get('/api/visits', requireAuth(), requireDatabase, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const orgId = req.auth.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'No organization associated with user' });
    }

    const result = await pool.query(
      `SELECT v.* FROM visits v
       JOIN organizations o ON v.organization_id = o.id
       WHERE o.clerk_org_id = $1 AND v.user_id = $2
       ORDER BY v.created_at DESC`,
      [orgId, userId]
    );

    const visits = result.rows.map(row => ({
      ...row,
      answers: row.answers ? JSON.parse(row.answers) : {},
      extras: row.extras ? JSON.parse(row.extras) : {},
      scoreSnapshot: row.score_snapshot ? JSON.parse(row.score_snapshot) : null,
    }));

    res.json(visits);
  } catch (err) {
    console.error('Get visits error:', err);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

app.get('/api/visits/:id', requireAuth(), requireDatabase, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const orgId = req.auth.orgId;
    const visitId = req.params.id;

    const result = await pool.query(
      `SELECT v.* FROM visits v
       JOIN organizations o ON v.organization_id = o.id
       WHERE o.clerk_org_id = $1 AND v.user_id = $2 AND v.id = $3`,
      [orgId, userId, visitId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const visit = result.rows[0];
    visit.answers = visit.answers ? JSON.parse(visit.answers) : {};
    visit.extras = visit.extras ? JSON.parse(visit.extras) : {};
    visit.scoreSnapshot = visit.score_snapshot ? JSON.parse(visit.score_snapshot) : null;

    res.json(visit);
  } catch (err) {
    console.error('Get visit error:', err);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

app.put('/api/visits/:id', requireAuth(), requireDatabase, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const orgId = req.auth.orgId;
    const visitId = req.params.id;
    const { answers, extras, scoreSnapshot, patientName } = req.body;

    // Verify ownership
    const verifyResult = await pool.query(
      `SELECT v.id FROM visits v
       JOIN organizations o ON v.organization_id = o.id
       WHERE o.clerk_org_id = $1 AND v.user_id = $2 AND v.id = $3`,
      [orgId, userId, visitId]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Update visit
    await pool.query(
      `UPDATE visits SET answers = $1, extras = $2, score_snapshot = $3, patient_name = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [JSON.stringify(answers), JSON.stringify(extras), JSON.stringify(scoreSnapshot), patientName, visitId]
    );

    res.json({ id: visitId, message: 'Visit updated successfully' });
  } catch (err) {
    console.error('Update visit error:', err);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

app.delete('/api/visits/:id', requireAuth(), requireDatabase, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const orgId = req.auth.orgId;
    const visitId = req.params.id;

    // Verify ownership
    const verifyResult = await pool.query(
      `SELECT v.id FROM visits v
       JOIN organizations o ON v.organization_id = o.id
       WHERE o.clerk_org_id = $1 AND v.user_id = $2 AND v.id = $3`,
      [orgId, userId, visitId]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Delete visit
    await pool.query('DELETE FROM visits WHERE id = $1', [visitId]);

    res.json({ message: 'Visit deleted successfully' });
  } catch (err) {
    console.error('Delete visit error:', err);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// Serve static files (index.html + assets)
app.use(express.static(path.join(__dirname)));

// Fallback: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

(async () => {
  await initializeDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Enterro360 server running on port ${PORT}`);
    console.log(`✓ Clerk auth enabled`);
    console.log(`📱 Visit: http://localhost:${PORT}/`);
  });
})().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
