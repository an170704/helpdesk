const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const AppError = require('../../utils/AppError');

const TOKEN_EXPIRES_IN = '1d';

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, full_name, role, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role, is_active
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function login(email, password) {
  const user = await findByEmail(email);
  const passwordOk = user && (await bcrypt.compare(password, user.password_hash));

  if (!passwordOk) {
    throw new AppError(401, 'Invalid email or password');
  }
  if (!user.is_active) {
    throw new AppError(403, 'Account has been disabled');
  }

  return {
    token: generateToken(user),
    user: toPublicUser(user),
  };
}

async function getProfile(id) {
  const user = await findById(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return toPublicUser(user);
}

module.exports = { login, getProfile };
