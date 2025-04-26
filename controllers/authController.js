const Center = require('../models/Center');
const Instructor = require('../models/Instructor');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    let user = await User.findOne({ username });
    // if (role === 'center') {
    //   user = await User.findOne({ username });
    // } else if (role === 'instructor') {
    //   user = await User.findOne({ username });
    // } else if (role === 'admin') {
    //   user = await User.findOne({ username });
    // }

    if (!user) {
      return res.status(400).json({ error: 'Utente non trovato' });
    }

    // Check if the user is active
    if (user?.role !== 'admin' && !user.isActive) {
      return res
        .status(403)
        .json({
          error: `Account non ancora attivato. Si prega di contattare l'amministratore!.`,
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenziali errate' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user?.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message, msg: 'some errors' });
  }
};

exports.getLoggedInInstructor = async (req, res) => {
  try {
    const instructor = await User.findById(req.user.id).select('-password');
    if (!instructor) {
      return res.status(404).json({ error: 'Istruttore non trovato' });
    }
    res.json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLoggedInCenter = async (req, res) => {
  try {
    const center = await User.findById(req.user.id)
      .populate('sanitarios instructors')
      .select('-password');
    if (!center) {
      return res.status(404).json({ error: 'Centro non trovato' });
    }
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
