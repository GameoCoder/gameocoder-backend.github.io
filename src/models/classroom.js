const db = require('../config/db');

/**
 * Finds the currently active class for a specific teacher based on the current day and time
 * @param {number} teacherId - The ID of the teacher (persons.person_id).
 * @returns {Promise<object|null>} A promise that resolves to the current class schedule object 
 *                                 or null if no class is currently active for the teacher.
 */
const findCurrentClassForTeacher = async (teacherId) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[new Date().getDay()];

  const query = {
    text: `
      SELECT
        s.schedule_id,
        sec.section_name AS class_name,
        sub.subject_name,
        s.day_of_week,
        s.start_time,
        s.end_time,
        CURRENT_DATE AS date
      FROM schedule s
      JOIN sections sec ON s.section_id = sec.section_id
      JOIN classrooms c ON s.classroom_id = c.classroom_id
      JOIN subjects sub ON s.subject_id = sub.subject_id
      WHERE s.teacher_id = $1
        AND s.day_of_week = $2
        AND CURRENT_TIME BETWEEN s.start_time AND s.end_time;
    `,
    values: [teacherId, currentDay],
  };

  const result = await db.query(query);
  const classData = result.rows[0];

  if (classData) {
    // Format time to HH:MM
    classData.start_time = classData.start_time.substring(0, 5);
    classData.end_time = classData.end_time.substring(0, 5);
  }
  return classData || null;
};

/**
 * Finds all scheduled classes for a specific teacher for the current day.
 * @param {number} teacherId - The ID of the teacher.
 * @returns {Promise<Array|null>} A promise that resolves to an array of schedule objects.
 */
const findSchedulesForTeacherByDay = async (teacherId) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[new Date().getDay()];

  const query = {
    text: `
      SELECT
        s.schedule_id,
        sec.section_name AS class_name,
        sub.subject_name,
        s.day_of_week,
        TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
        CURRENT_DATE AS date
      FROM schedule s
      JOIN sections sec ON s.section_id = sec.section_id
      JOIN subjects sub ON s.subject_id = sub.subject_id
      WHERE s.teacher_id = $1 AND s.day_of_week = $2
      ORDER BY s.start_time;
    `,
    values: [teacherId, currentDay],
  };

  const result = await db.query(query);
  return result.rows;
};

/**
 * Finds all scheduled classes from the database.
 * @returns {Promise<Array>} A promise that resolves to an array of all schedule objects.
 */
const findAllSchedules = async () => {
  const query = {
    text: `
      SELECT
        s.schedule_id,
        sec.section_name AS class_name,
        sub.subject_name,
        s.day_of_week,
        TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
        TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
        CURRENT_DATE AS date
      FROM schedule s
      JOIN sections sec ON s.section_id = sec.section_id
      JOIN subjects sub ON s.subject_id = sub.subject_id
      ORDER BY s.schedule_id;
    `,
  };
  const result = await db.query(query);
  return result.rows;
};

module.exports = {
  findCurrentClassForTeacher,
  findSchedulesForTeacherByDay,
  findAllSchedules,
};