-- ================================
-- Attendance System Database Schema
-- ================================

-- Drop tables in reverse order of dependencies (for clean rebuilds)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS schedule CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS teacher_sections CASCADE;
DROP TABLE IF EXISTS student_sections CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS persons CASCADE;


-- ================================
-- 1. Persons (Students + Teachers)
-- ================================
CREATE TABLE persons (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rfid_tag VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('student', 'teacher')) NOT NULL,
    id_number VARCHAR(20) UNIQUE,
	password VARCHAR(90)
);

-- ================================
-- 2. Sections
-- ================================
CREATE TABLE sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(50) UNIQUE NOT NULL
);

-- ================================
-- 3. Student → Section Mapping
-- ================================
CREATE TABLE student_sections (
    person_id INT REFERENCES persons(person_id) ON DELETE CASCADE,
    section_id INT REFERENCES sections(section_id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, section_id)
);

-- ================================
-- 4. Teacher → Section Mapping
-- ================================
CREATE TABLE teacher_sections (
    person_id INT REFERENCES persons(person_id) ON DELETE CASCADE,
    section_id INT REFERENCES sections(section_id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, section_id)
);

-- ================================
-- 5. Classrooms
-- ================================
CREATE TABLE classrooms (
    classroom_id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL
);

-- ================================
-- New Table: Subjects
-- ================================
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) UNIQUE NOT NULL
);

-- ================================
-- 6. Schedule (Flexible Timetable)
-- ================================
CREATE TABLE schedule (
    schedule_id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(subject_id) ON DELETE CASCADE,
    section_id INT REFERENCES sections(section_id) ON DELETE CASCADE,
    teacher_id INT REFERENCES persons(person_id) ON DELETE CASCADE,
    classroom_id INT REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) CHECK (day_of_week IN 
        ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

-- ================================
-- 7. Attendance Logs
-- ================================
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    schedule_id INT REFERENCES schedule(schedule_id) ON DELETE CASCADE,
    rfid_tag VARCHAR(100) REFERENCES persons(rfid_tag) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) CHECK (status IN ('present', 'absent'))
    -- UNIQUE (schedule_id, rfid_tag) -- prevents duplicates. This might be too restrictive if you want to log multiple statuses for the same schedule (e.g. absent then present).
);


INSERT INTO persons (name, rfid_tag, role, id_number, password) VALUES
('Nitin Verma', 'B2F7AF6A','teacher','2500032073','$2a$10$xqvlgnoqwdiIbauJrYUuC.aL34qhVoLaTeJ6yxqN6RMaLE0.FyCVK'),
('Abhijeet Raj', '717C423C','student','2500031388','$2a$10$Cl1HUEi42jS2R1NzRe9QVOSLF9Yg78fcUhPGa6sIm1pNwyOyaXev2'),
('Ayan Roy', '313F333D', 'student', '2500031529', '$2a$10$OIgEpa6yZ2.EpGywNklktuPBN6PRD53i5WA.7MB4yy3TM0A9yxHNS'),
('Pushkar Roy', 'B16C3A3D', 'student', '2500030922', '$2a$10$Jd3XYSVJGZ74ipriFZmbgO9OgFDqSTlEHQZXvnDDorUqMSVqZGPAy'),
('Mr. Sam', 'B2F7AF6B', 'teacher', '7862', '$2a$10$xqvlgnoqwdiIbauJrYUuC.aL34qhVoLaTeJ6yxqN6RMaLE0.FyCVK');


INSERT INTO sections (section_name) VALUES
('S33'),
('S34'),
('S35'),
('S36'),
('S37'),
('S38'),
('S39'),
('S40'),
('S41'),
('S42'),
('S43'),
('S44'),
('S45'),
('S46'),
('S47'),
('S48'),
('S49'),
('S50'),
('S51'),
('S52');

INSERT INTO classrooms (room_number) VALUES
('CR-101'),
('CR-102'),
('LAB-201');

-- Insert a subject
INSERT INTO subjects (subject_name) VALUES
('Computer Science');

-- Schedule a class for Mr. Sam (person_id=5) for section S33 (section_id=1) in CR-101 (classroom_id=1)
-- To test this, you'll need to make the API call on a Monday between 09:00 and 10:00 local time.
-- You can adjust the day_of_week and times to match when you are testing.
INSERT INTO schedule (section_id, subject_id, teacher_id, classroom_id, day_of_week, start_time, end_time) VALUES
(
    (SELECT section_id FROM sections WHERE section_name = 'S33'),
    (SELECT subject_id FROM subjects WHERE subject_name = 'Computer Science'),
    (SELECT person_id FROM persons WHERE name = 'Mr. Sam'),
    (SELECT classroom_id FROM classrooms WHERE room_number = 'CR-101'),
    'Monday', '09:00:00', '10:00:00'
);