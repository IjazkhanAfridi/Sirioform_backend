const Sanitario = require('../models/Sanitario');

exports.createSanitario = async (req, res) => {
  const { firstName, lastName, fiscalCode, address, city, region, email, phone } = req.body;

  try {
    const newSanitario = new Sanitario({
      firstName,
      lastName,
      fiscalCode,
      address,
      city,
      region,
      email,
      phone
    });

    await newSanitario.save();
    res.status(201).json(newSanitario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSanitarios = async (req, res) => {
  try {
    const sanitarios = await Sanitario.find();
    res.json(sanitarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSanitario = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedSanitario = await Sanitario.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedSanitario) {
      return res.status(404).json({ error: 'Sanitario non trovato' });
    }

    res.json(updatedSanitario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSanitario = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSanitario = await Sanitario.findByIdAndDelete(id);

    if (!deletedSanitario) {
      return res.status(404).json({ error: 'Sanitario non trovato' });
    }

    res.json({ message: 'Sanitario eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
