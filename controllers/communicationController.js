const Communication = require('../models/Communication');

const createCommunication = async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageUrl = req.files && req.files.image && req.files.image[0] ? `/uploads/${req.files.image[0].filename}` : '';
    const communication = new Communication({ title, description, imageUrl });
    await communication.save();

    res
      .status(201)
      .json({ message: 'Comunicazione creata correttamente!', communication });
  } catch (error) {
    res.status(500).json({ message: 'Errore nel creare la comunicazione', error });
  }
};

const getCommunications = async (req, res) => {
  try {
    const communications = await Communication.find();
    res.status(200).json(communications);
  } catch (error) {
    res.status(500).json({ message: `Errore nel recupero dell'informazioni`, error });
  }
};

const updateCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const imageUrl = req.files && req.files.image && req.files.image[0] ? `/uploads/${req.files.image[0].filename}` : null;

    const updateData = { title, description };
    if (imageUrl) updateData.imageUrl = imageUrl;

    const communication = await Communication.findByIdAndUpdate(id, updateData, { new: true });

    if (!communication) {
      return res.status(404).json({ message: 'Comunicazione non trovata' });
    }

    res.status(200).json({ message: 'Comunicazione aggiornata con successo!', communication });
  } catch (error) {
    res.status(500).json({ message: `Errore nell'aggiornamento della comunicazione!`, error });
  }
};

const deleteCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const communication = await Communication.findByIdAndDelete(id);

    if (!communication) {
      return res.status(404).json({ message: 'Comunicazione non trovata' });
    }

    res.status(200).json({ message: 'Comunicazione eliminata con successo!' });
  } catch (error) {
    res.status(500).json({ message: `Errore nell'eliminazione della comunicazione!`, error });
  }
};


module.exports = { createCommunication, getCommunications ,updateCommunication,deleteCommunication};
