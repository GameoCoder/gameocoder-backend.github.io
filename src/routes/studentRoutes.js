const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * POST /students
 * Adds a new student to the database.
 * This is a simplified version and assumes a default password and role.
 */
router.post('/', async (req, res) => {
    const { name, student_id, section, rfid_tag } = req.body;

    if (!name || !student_id || !section || !rfid_tag) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Hash a default password (e.g., 'password123')
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Insert into persons table
        const personInsert = await client.query(
            'INSERT INTO persons (name, rfid_tag, role, id_number, password) VALUES ($1, $2, $3, $4, $5) RETURNING person_id',
            [name, rfid_tag, 'student', student_id, hashedPassword]
        );
        const newPersonId = personInsert.rows[0].person_id;

        // Get section_id
        const sectionResult = await client.query('SELECT section_id FROM sections WHERE section_name = $1', [section]);
        if (sectionResult.rows.length === 0) {
            throw new Error(`Section "${section}" not found.`);
        }
        const sectionId = sectionResult.rows[0].section_id;

        // Map student to section
        await client.query('INSERT INTO student_sections (person_id, section_id) VALUES ($1, $2)', [newPersonId, sectionId]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: `Student ${name} added successfully.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding student:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to add student.' });
    } finally {
        client.release();
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