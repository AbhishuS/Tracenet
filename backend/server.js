const express = require('express');
const cors = require('cors');

const app = express();

const traderRoutes = require('./routes/traderRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const fraudRoutes = require('./routes/fraudRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use(cors());
app.use(express.json());

app.use('/api/traders', traderRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});