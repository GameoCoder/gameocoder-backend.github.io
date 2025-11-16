const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(' ')[1];
    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
      if (err) return res.sendStatus(403); 
      req.user = authData;
      next();
    });
  } else {
    res.sendStatus(401); 
  }
};

router.get('/attendance-status', verifyToken, async (req, res) => {
  const { schedule_id } = req.query;
  if (!schedule_id) {
    return res.status(400).json({ success: false, message: 'schedule_id query parameter is required.' });
  }
  try {
    const enrolledStudentsQuery = `
      SELECT p.person_id, p.name, p.id_number, p.rfid_tag
      FROM persons p
      JOIN student_sections ss ON p.person_id = ss.person_id
      WHERE ss.section_id = (SELECT section_id FROM schedule WHERE schedule_id = $1)
      ORDER BY p.name;
    `;
    const enrolledStudentsResult = await db.query(enrolledStudentsQuery, [schedule_id]);
    const allStudents = enrolledStudentsResult.rows;
    const presentStudentsQuery = 'SELECT rfid_tag FROM attendance WHERE schedule_id = $1';
    const presentStudentsResult = await db.query(presentStudentsQuery, [schedule_id]);
    const presentRfids = new Set(presentStudentsResult.rows.map(row => row.rfid_tag));
    const attendanceStatus = allStudents.map(student => ({
      ...student,
      status: presentRfids.has(student.rfid_tag) ? 'present' : 'absent',
    }));
    res.status(200).json({ success: true, attendance: attendanceStatus });
  } catch (error) {
    console.error('Error fetching attendance status:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance status.' });
  }
});

router.post('/start-attendance/:schedule_id', verifyToken, async (req, res) => {
  const { schedule_id } = req.params;
  try {
    const studentsQuery = `
      SELECT 
        p.id_number as roll_no, 
        p.name, 
        p.rfid_tag,
        false as present
      FROM persons p
      JOIN student_sections ss ON p.person_id = ss.person_id
      WHERE ss.section_id = (SELECT section_id FROM schedule WHERE schedule_id = $1)
      ORDER BY p.id_number;
    `;
    const { rows: students } = await db.query(studentsQuery, [schedule_id]);
    res.status(200).json({ attendance: students });
  } catch (error) {
    console.error('Error starting attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to start attendance.' });
  }
});


router.post('/finalize-attendance/:schedule_id', verifyToken, async (req, res) => {
  const { schedule_id } = req.params;
  const { finalized } = req.body;
  if (!finalized || !Array.isArray(finalized)) {
    return res.status(400).json({ success: false, message: 'Invalid attendance data provided.' });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const student of finalized) {
      if (student.present) {
        const upsertQuery = `
          INSERT INTO attendance (schedule_id, rfid_tag, timestamp, status)
          SELECT $1, p.rfid_tag, NOW(), 'present'
          FROM persons p WHERE p.id_number = $2
          ON CONFLICT (schedule_id, rfid_tag) DO NOTHING;
        `;
        await client.query(upsertQuery, [schedule_id, student.roll_no]);
      }
    }
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Attendance finalized successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error finalizing attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to finalize attendance.' });
  } finally {
    client.release();
  }
});

module.exports = router;