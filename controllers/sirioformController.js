const User = require('../models/User');

exports.registerSirioform = async (req, res) => {
  const {
    name,
    piva,
    address,
    city,
    region,
    provincia,
    cap,
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
      provincia,
      cap,
      email,
      phone,
      username,
      password: hashedPassword,
      isActive: false,
      role: 'sirioform',
      sanitarios: [],
      instructors: [], 
    });

    await newCenter.save();

    // Invia email di conferma
    sendEmail(
      email,
      'Registrazione sirioform',
      'Grazie per esserti registrato! Il tuo account è in attesa di approvazione.'
    );

    await createNotification({
      message: `il sirioform ${name} si è registrato. in attesa di approvazione`,
      senderId: null,
      category: 'centerAccount',
      userName: newCenter.name,
      isAdmin: true,
    });
    res.status(201).json(newCenter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateSirioform = async (req, res) => {
  const { centerId } = req.params;
  const {
    name,
    piva,
    address,
    city,
    region,
    provincia,
    cap,
    email,
    phone,
    username,
    isActive,
    role,
    sanitarios,
    instructors,
  } = req.body;

  try {
    let center = await User.findById(centerId);
    if (!center || center.role !== 'sirioform') {
      return res.status(404).json({ error: 'sirioform non trovato.' });
    }
    if (req.user.role === 'admin') {
      center.name = name || center.name;
      center.piva = piva || center.piva;
      center.address = address || center.address;
      center.city = city || center.city;
      center.region = region || center.region;
      center.provincia = provincia || center.provincia;
      center.cap = cap || center.cap;
      center.email = email || center.email;
      center.phone = phone || center.phone;
      center.username = username || center.username;
      center.isActive = isActive !== undefined ? isActive : center.isActive;
      center.role = role || center.role;
      center.sanitarios = sanitarios || center.sanitarios;
      center.instructors = instructors || center.instructors;
    } else if (req.user.role === 'sirioform') {
      center.piva = piva || center.piva;
      center.address = address || center.address;
      center.city = city || center.city;
      center.region = region || center.region;
      center.provincia = provincia || center.provincia;
      center.cap = cap || center.cap;
      center.email = email || center.email;
      center.phone = phone || center.phone;
    } else {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    await center.save();

    res.status(200).json({ message: 'sirioform updated successfully.', center });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSirioform = async (req, res) => {
  try {
    const sirioform = await User.find({ isActive: true,role:'sirioform' }).populate('sanitarios');
    res.json(sirioform);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};