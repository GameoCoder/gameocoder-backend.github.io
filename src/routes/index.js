const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const studentRoutes = require('./studentRoutes');

router.use('/', authRoutes);
router.use('/schedules', eventRoutes);
router.use('/students', studentRoutes);

module.exports = router;