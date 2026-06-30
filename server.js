const express = require('express');
const path = require('path');
const app = express();

// Define credentials (change these!)
const username = 'clinician';
const password = 'clinic2024';
const credentials = Buffer.from(`${username}:${password}`).toString('base64');

// HTTP Basic Auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;

  // Check if Authorization header exists and matches
  if (!auth || auth !== `Basic ${credentials}`) {
    res.setHeader('WWW-Authenticate', 'Basic realm="GSHS Demo"');
    return res.status(401).send('Access denied. Please provide valid credentials.');
  }

  next();
});

// Serve static files (index.html + any other assets)
app.use(express.static(path.join(__dirname)));

// Fallback: serve index.html for SPA routing (if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GSHS server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}/`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
});
