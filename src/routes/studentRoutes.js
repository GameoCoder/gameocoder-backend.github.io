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

module.exports = router;