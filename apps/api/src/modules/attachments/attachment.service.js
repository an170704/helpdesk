const pool = require('../../config/db');

async function create({ ticketId, uploadedBy, commentId = null, files }) {
  const values = [];
  const params = [];

  files.forEach((file, index) => {
    const offset = index * 5;
    params.push(
      ticketId,
      commentId,
      file.originalname,
      `/uploads/attachments/${file.filename}`,
      uploadedBy
    );
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
  });

  const { rows } = await pool.query(
    `INSERT INTO ticket_attachments (ticket_id, comment_id, file_name, file_url, uploaded_by)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params
  );
  return rows;
}

module.exports = { create };
