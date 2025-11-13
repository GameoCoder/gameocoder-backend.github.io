const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /faculty/attendance-status
 * Retrieves the attendance status for all students in a given class schedule.
 * It returns a list of all students enrolled, marking them as 'present' or 'absent'.
 *
 * Query Parameters:
 *  - schedule_id: The ID of the class schedule to check.
 */
router.get('/attendance-status', async (req, res) => {
  const { schedule_id } = req.query;

  if (!schedule_id) {
    return res.status(400).json({ success: false, message: 'schedule_id query parameter is required.' });
  }

  try {
    // 1. Get all students for the section associated with the schedule_id
    const enrolledStudentsQuery = `
      SELECT p.person_id, p.name, p.id_number, p.rfid_tag
      FROM persons p
      JOIN student_sections ss ON p.person_id = ss.person_id
      WHERE ss.section_id = (SELECT section_id FROM schedule WHERE schedule_id = $1)
      ORDER BY p.name;
    `;
    const enrolledStudentsResult = await db.query(enrolledStudentsQuery, [schedule_id]);
    const allStudents = enrolledStudentsResult.rows;

    // 2. Get all RFID tags of students who are marked 'present' for this schedule
    const presentStudentsQuery = 'SELECT rfid_tag FROM attendance WHERE schedule_id = $1';
    const presentStudentsResult = await db.query(presentStudentsQuery, [schedule_id]);
    const presentRfids = new Set(presentStudentsResult.rows.map(row => row.rfid_tag));

    // 3. Combine the lists to determine who is present or absent
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

module.exports = router;