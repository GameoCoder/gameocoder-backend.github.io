const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Person = require('../models/person');
require('dotenv').config();

const loginUser = async (req, res) => {
  const { username: id_number, password } = req.body;

  try {
    const user = await Person.findByIdNumber(id_number);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'teacher') {
        return res.status(403).json({ error: 'Login forbidden for this user role' });
    }

    const payload = {
      id: user.person_id,
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token: token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

router.post('/login', loginUser);

module.exports = router;