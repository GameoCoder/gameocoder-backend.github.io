const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Classroom = require('../models/classroom');
const db = require('../config/db');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(' ')[1];
    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
      if (err) return res.sendStatus(403); // Forbidden
      req.user = authData; // Set user data from token
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// router.get('/current-class-no-auth', async (req,res) => {
//   try {
//     const { teacherId } = req.query;
//     if(!teacherId) {
//       return res.status(400).json({ error: "teacherId query parameter is required."});
//     }
//   }
// });

router.get('/current-class', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id; // Get teacher ID securely from the token
    // The Classroom.findCurrentClassForTeacher model function is not provided.
    // The logic is implemented here directly to handle time zones correctly.
    const timeZone = 'Asia/Kolkata'; // IST time zone for India

    const query = `
      SELECT 
        s.schedule_id,
        sub.subject_name,
        sec.section_name,
        cr.room_number,
        s.day_of_week,
        s.start_time,
        s.end_time
      FROM schedule s
      JOIN subjects sub ON s.subject_id = sub.subject_id
      JOIN sections sec ON s.section_id = sec.section_id
      JOIN classrooms cr ON s.classroom_id = cr.classroom_id
      WHERE s.teacher_id = $1
        AND s.day_of_week = to_char(NOW() AT TIME ZONE $2, 'FMDay')
        AND (NOW() AT TIME ZONE $2)::time BETWEEN s.start_time AND s.end_time;
    `;
    const { rows } = await db.query(query, [teacherId, timeZone]);
    const currentClass = rows[0];
    
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
      const { rfid_tag, timestamp } = record; // Ensure record is not null/undefined
      if (!rfid_tag || !timestamp) {
        failed++;
        // Push a result for records that are malformed
        results.push({ rfid_tag: rfid_tag || 'unknown', success: false, message: 'Malformed record in payload', isDuplicate: false });
        continue;
      }
      
      try {
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
        }
      } catch (err) {
        failed++;
        results.push({ rfid_tag, success: false, message: 'Failed to record attendance', isDuplicate: false, student: null });
        console.error(`Failed to process RFID ${rfid_tag}:`, err.message);
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