const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const studentRoutes = require('./studentRoutes');
const facultyRoutes = require('./facultyRoutes');

router.use('/', authRoutes);
router.use('/schedules', eventRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', require('./facultyRoutes'));

module.exports = router;