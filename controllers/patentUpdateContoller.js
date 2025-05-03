const PatentUpdate = require('../models/PatentUpdate');
const path = require('path');
const fs = require('fs');

// Create Patent Update (POST)
exports.createPatentUpdate = async (req, res) => {
  try {
    const { code, type, isForInstructor, isForTrainer, description, cost } = req.body;
    const newPatentUpdate = new PatentUpdate({
      code,
      type,
      isForInstructor,
      isForTrainer,
      description,
      cost,
      profileImage: req.files && req.files['profileImage'] ? req.files['profileImage'][0].path : '',
    });
    
    const savedPatentUpdate = await newPatentUpdate.save();
    res.json(savedPatentUpdate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Patent Updates (GET)
exports.getPatentUpdates = async (req, res) => {
  try {
    // Filter by user type if needed
    const userRole = req.user.role;
    let filter = {};
    
    if (userRole === 'instructor') {
      filter.isForInstructor = true;
    } else if (userRole === 'trainer') {
      filter.isForTrainer = true;
    }
    
    const patentUpdates = await PatentUpdate.find(filter);
    res.json(patentUpdates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Patent Update by ID (GET)
exports.getPatentUpdateById = async (req, res) => {
  try {
    const { id } = req.params;
    const patentUpdate = await PatentUpdate.findById(id);
    if (!patentUpdate) {
      return res.status(404).json({ error: 'Aggiornamento brevetto non trovato.' });
    }
    res.json(patentUpdate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Patent Update (PATCH)
exports.updatePatentUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const patentUpdate = await PatentUpdate.findById(id);
    if (!patentUpdate) {
      return res.status(404).json({ error: 'Aggiornamento brevetto non trovato.' });
    }
    
    const fieldsToUpdate = ['code', 'type', 'isForInstructor', 'isForTrainer', 'description', 'cost'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        patentUpdate[field] = req.body[field];
      }
    });
    
    if (req.files && req.files['profileImage'] && req.files['profileImage'][0]) {
      if (patentUpdate.profileImage) {
        const oldImagePath = path.join(__dirname, '..', patentUpdate.profileImage);
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.error('Errore nella cancellazione dell\'immagine precedente:', err);
          }
        });
      }
      patentUpdate.profileImage = req.files['profileImage'][0].path;
    }

    const updatedPatentUpdate = await patentUpdate.save();
    res.json(updatedPatentUpdate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Patent Update (DELETE)
exports.deletePatentUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const patentUpdate = await PatentUpdate.findById(id);
    if (!patentUpdate) {
      return res.status(404).json({ error: 'Aggiornamento brevetto non trovato.' });
    }

    // Delete the image file if it exists
    if (patentUpdate.profileImage) {
      const imagePath = path.join(__dirname, '..', patentUpdate.profileImage);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Errore nella cancellazione dell\'immagine:', err);
        }
      });
    }

    await PatentUpdate.deleteOne({ _id: id });
    res.json({ message: 'Aggiornamento brevetto eliminato con successo.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};