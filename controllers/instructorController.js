const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/emailService');
const axios = require('axios');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');

exports.registerInstructor = async (req, res) => {
  console.log('req.file: ', req.file);
  const resumeUrl = req.files && req.files.resumeUrl && req.files.resumeUrl[0] ? `/uploads/${req.files.resumeUrl[0].filename}` : '';
  const {
    firstName,
    lastName,
    fiscalCode,
    brevetNumber,
    qualifications,
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

  console.log('resumeUrl: ', resumeUrl);

  if (password !== repeatPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  const today = new Date();
  for (const qualification of qualifications) {
    const expirationDate = new Date(qualification.expirationDate);
    if (expirationDate < today) {
      return res.status(400).json({
        error: `Qualification '${qualification.name}' has an expiration date earlier than today.`,
      });
    }
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
    const existingInstructor = await User.findOne({ username });
    if (existingInstructor) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const formattedQualifications = qualifications.map((q) => ({
      name: q.name,
      expirationDate: new Date(q.expirationDate),
    }));

    const newInstructor = new User({
      firstName,
      lastName,
      fiscalCode,
      brevetNumber,
      qualifications: formattedQualifications,
      piva,
      address,
      city,
      region,
      email,
      phone,
      username,
      password: hashedPassword,
      isActive: false,
      role: 'instructor',
      resumeUrl,
      sanitarios: [],
    });

    await newInstructor.save();

    // Invia email di conferma
    sendEmail(
      email,
      'Registrazione Istruttore',
      'Grazie per esserti registrato! Il tuo account è in attesa di approvazione.'
    );

    await createNotification({
      message: `${firstName+' '+lastName} Instructor Registered`,
      senderId: null,
      category: 'instructorAccount',
      userName: newInstructor?.firstName + ' ' + newInstructor?.lastName,
      isAdmin: true,
    });

    res.status(201).json(newInstructor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateInstructor = async (req, res) => {
  const userId = req.params.id;
  console.log('userId: ', userId);
  const role = req.user?.role;

  const updates = req.body;

  if (role === 'center') {
    const restrictedFields = [
      'firstName',
      'lastName',
      'brevetNumber',
      'fiscalCode',
    ];
    restrictedFields.forEach((field) => {
      if (updates.hasOwnProperty(field)) {
        delete updates[field];
      }
    });
  }

  try {
    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUnapprovedInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ isActive: false });
    res.json(instructors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveInstructor = async (req, res) => {
  try {
    const instructor = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    // Invia email di conferma
    sendEmail(
      instructor.email,
      'Account Attivato',
      'Il tuo account è stato approvato e attivato. Puoi ora accedere al sistema.'
    );

    res.json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ isActive: true, role: 'instructor' });
    res.json(instructors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInstructorById = async (req, res) => {
  try {
    const instructor = await User.findById(req.params.id).populate(
      'sanitarios'
    );
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    res.json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assegna un sanitario a un istruttore
exports.assignSanitario = async (req, res) => {
  const { instructorId, sanitarioId } = req.body;
  try {
    const instructor = await User.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    if (instructor.sanitarios.includes(sanitarioId)) {
      return res
        .status(400)
        .json({ error: 'Sanitario already assigned to this instructor' });
    }

    instructor.sanitarios.push(sanitarioId);
    await instructor.save();
    res.status(200).json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ottiene i sanitari assegnati a un istruttore
exports.getAssignedSanitarios = async (req, res) => {
  try {
    const instructor = await User.findById(req.params.id).populate(
      'sanitarios'
    );
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    res.status(200).json(instructor.sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rimuove un sanitario da un istruttore
exports.removeSanitario = async (req, res) => {
  const { instructorId, sanitarioId } = req.body;
  try {
    const instructor = await User.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    instructor.sanitarios.pull(sanitarioId);
    await instructor.save();
    res.status(200).json(instructor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInstructorSanitarios = async (req, res) => {
  try {
    const instructorId = req.params.id;
    const instructor = await User.findById(instructorId).populate('sanitarios');
    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    res.json(instructor.sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteInstructor = async (req, res) => {
  const { id } = req.params;

  try {
    const instructor = await User.findById(id);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ error: 'Instructor not found' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'Center deleted successfully' });

    // Optionally, you can add additional logic like sending a notification or email.
    // sendEmail(center.email, 'Account Deleted', 'Your account has been deleted.');
    // await createNotification({
    //   message: `Center with ID ${centerId} has been deleted.`,
    //   senderId: null,
    //   category: 'centerAccount',
    //   isAdmin: true,
    // });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.changeInstructorStatus = async (req, res) => {
  const { id } = req.params;
  console.log('id: ', id);
  const { isActive } = req.body;
  console.log('isActive: ', isActive);

  try {
    const instructor = await User.findById(id);
    console.log('instructor: ', instructor);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    instructor.isActive = isActive;
    await instructor.save();

    res.status(200).json({ message: 'Instructor status updated successfully', instructor });
  } catch (err) {
    console.log('errsd: ', err);
    res.status(500).json({ error: err.message });
  }
};