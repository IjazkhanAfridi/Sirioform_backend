const mongoose = require('mongoose');
const Center = require('../models/Center');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailService');
const axios = require('axios');
const Sanitario = require('../models/Sanitario');
const Instructor = require('../models/Instructor'); // Importa il modello dell'istruttore
const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');

exports.registerCenter = async (req, res) => {
  const {
    name,
    piva,
    address,
    city,
    region,
    email,
    phone,
    username,
    password,
    repeatPassword,
    recaptchaToken,
  } = req.body;

  if (password !== repeatPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Verifica reCAPTCHA
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const response = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`
  );

  if (!response.data.success) {
    return res.status(400).json({ error: 'reCAPTCHA validation failed' });
  }

  try {
    const existingCenter = await User.findOne({ username });
    if (existingCenter) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newCenter = new User({
      name,
      piva,
      address,
      city,
      region,
      email,
      phone,
      username,
      password: hashedPassword,
      isActive: false,
      role:'center',
      sanitarios: [],
      instructors: [], // Inizializza l'array degli istruttori
    });

    await newCenter.save();

    // Invia email di conferma
    sendEmail(
      email,
      'Registrazione Centro',
      'Grazie per esserti registrato! Il tuo account è in attesa di approvazione.'
    );

    await createNotification({
      message: `New Center Registered`,
      senderId: null,
      category:'centerAccount',
      isAdmin: true,
    });
    res.status(201).json(newCenter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateCenter = async (req, res) => {
  const { centerId } = req.params;
  const { piva, address, city, region, email, phone } = req.body;  // Fields that can be updated

  try {
    let center = await User.findById(centerId);
    console.log('center: ', center);
    if (!center || center.role !== 'center') {
      return res.status(404).json({ error: 'Center not found.' });
    }

    // Update only the allowed fields
    center.piva = piva || center.piva;
    center.address = address || center.address;
    center.city = city || center.city;
    center.region = region || center.region;
    center.email = email || center.email;
    center.phone = phone || center.phone;

    // Save the updated center
    await center.save();

    res.status(200).json({ message: 'Center updated successfully.', center });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUnapprovedCenters = async (req, res) => {
  try {
    const centers = await User.find({ isActive: false });
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveCenter = async (req, res) => {
  try {
    const center = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    // Invia email di conferma
    sendEmail(
      center.email,
      'Account Attivato',
      'Il tuo account è stato approvato e attivato. Puoi ora accedere al sistema.'
    );

    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllCenters = async (req, res) => {
  try {
    const centers = await User.find({ isActive: true,role:'center' });
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCenterById = async (req, res) => {
  try {
    const center = await User.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assegna un sanitario a un centro
exports.assignSanitario = async (req, res) => {
  const { centerId, sanitarioId } = req.body;
  try {
    const center = await User.findById(centerId);
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    if (center.sanitarios.includes(sanitarioId)) {
      return res
        .status(400)
        .json({ error: 'Sanitario already assigned to this center' });
    }

    center.sanitarios.push(sanitarioId);
    await center.save();
    res.status(200).json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ottiene i sanitari assegnati a un centro
exports.getAssignedSanitarios = async (req, res) => {
  try {
    const center = await User.findById(req.params.id).populate('sanitarios');
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.status(200).json(center.sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rimuove un sanitario da un centro
exports.removeSanitario = async (req, res) => {
  const { centerId, sanitarioId } = req.body;
  try {
    const center = await User.findById(centerId);
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    center.sanitarios.pull(sanitarioId);
    await center.save();
    res.status(200).json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ottiene i sanitari assegnati al centro loggato
exports.getCenterSanitarios = async (req, res) => {
  try {
    const centerId = req.params.centerId;
    const center = await User.findById(centerId).populate('sanitarios');
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    res.json(center.sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};

// Assegna un istruttore a un centro
exports.assignInstructor = async (req, res) => {
  try {
    const { centerId, instructorId } = req.body;
    const center = await User.findById(centerId);
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    if (center.instructors.includes(instructorId)) {
      return res
        .status(400)
        .json({ error: 'Istruttore già assegnato a questo centro' });
    }

    center.instructors.push(instructorId);
    await center.save();
    res.json({ message: 'Istruttore assegnato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore del server' });
  }
};

// Ottiene gli istruttori assegnati a un centro
exports.getAssignedInstructors = async (req, res) => {
  try {
    const center = await User.findById(req.params.id).populate('instructors');
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.status(200).json(center.instructors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rimuove un istruttore da un centro
exports.removeInstructor = async (req, res) => {
  const { centerId, instructorId } = req.body;
  try {
    const center = await User.findById(centerId);
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    center.instructors.pull(instructorId);
    await center.save();
    res.status(200).json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Funzione per ottenere gli istruttori assegnati al centro loggato
exports.getCenterInstructors = async (req, res) => {
  try {
    const centerId = req.params.centerId;
    const center = await User.findById(centerId).populate('Instructor');
    if (!center) {
      return res.status(404).json({ error: 'Center not found' });
    }

    res.json(center.sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};
