const db = require('../config/db');

const findByIdNumber = async (id_number) => {
  try {
    const query = {
      text: 'SELECT * FROM persons WHERE id_number = $1',
      values: [id_number],
    };

    const result = await db.query(query);
    return result.rows[0];
  
  } catch (err) {
    console.error('Error querying for person by ID number:', err);
    throw err;
  }
};

module.exports = {
  findByIdNumber,
};