const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Classroom = require('../models/classroom');
const db = require('../config/db');
require('dotenv').config();

router.get('/current-class', async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId query parameter is required.' });
    }
    const currentClass = await Classroom.findCurrentClassForTeacher(teacherId);
    
    currentClass ? res.json(currentClass) : res.status(404).json({ message: 'No active class found at the moment.' });
  } catch (error) {
    console.error('Error fetching current class:', error);
    res.status(500).json({ error: 'Failed to retrieve class schedule.' });
  }
});

/**
 * GET /schedules
 * Finds and returns all class schedules for the authenticated teacher for the current day.
 */
router.get('/', async (req, res) => { // No longer requires teacherId
  try {
    const schedules = await Classroom.findAllSchedules();
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules.' });
  }
});

router.post('/bulk-attendance', async (req, res) => {
  const { schedule_id, attendance_data } = req.body;

  if (!schedule_id || !attendance_data || !Array.isArray(attendance_data)) {
    return res.status(400).json({ success: false, message: 'Missing schedule_id or attendance_data' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const results = [];
    let successful = 0;
    let duplicates = 0;
    let failed = 0;

    for (const record of attendance_data) {
      const { rfid_tag, timestamp } = record;

      // Check if attendance for this RFID tag and schedule already exists
      const duplicateCheck = await client.query('SELECT attendance_id FROM attendance WHERE schedule_id = $1 AND rfid_tag = $2', [schedule_id, rfid_tag]);

      if (duplicateCheck.rows.length > 0) {
        duplicates++;
        results.push({ rfid_tag, success: false, message: 'Duplicate attendance record', isDuplicate: true });
        continue;
      }

      // Insert new attendance record
      const insertResult = await client.query(
        'INSERT INTO attendance (schedule_id, rfid_tag, timestamp, status) VALUES ($1, $2, $3, $4) RETURNING rfid_tag',
        [schedule_id, rfid_tag, timestamp, 'present']
      );

      if (insertResult.rows.length > 0) {
        successful++;
        const person = await client.query('SELECT name, (SELECT section_name FROM sections WHERE section_id = student_sections.section_id) as section FROM persons JOIN student_sections ON persons.person_id = student_sections.person_id WHERE rfid_tag = $1', [rfid_tag]);
        results.push({ rfid_tag, success: true, message: 'Present', student: person.rows[0] || null, isDuplicate: false });
      } else {
        failed++;
        results.push({ rfid_tag, success: false, message: 'Failed to record attendance', isDuplicate: false });
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, summary: { successful, duplicates, failed }, results });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during bulk attendance submission:', error);
    res.status(500).json({ success: false, message: 'Server error during bulk attendance submission' });
  } finally {
    client.release();
  }
});

module.exports = router;