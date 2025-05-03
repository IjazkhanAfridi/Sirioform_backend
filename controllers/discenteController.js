const Discente = require('../models/Discente');
const Order = require('../models/Order');

// Funzione per creare un nuovo discente
const createDiscente = async (req, res) => {
  const {
    nome,
    cognome,
    codiceFiscale,
    indirizzo,
    città,
    regione,
    email,
    telefono,
    patentNumber,
    dateOfBirth,
    placeOfBirth,
    province,
    residenceIn,
    street,
    number,
    zipCode,
    gender,
    companyAffiliation,
  } = req.body;
  try {
    const newDiscente = new Discente({
      nome,
      cognome,
      codiceFiscale,
      indirizzo,
      città,
      regione,
      email,
      telefono,
      patentNumber: patentNumber == null ? [] : patentNumber,
      dateOfBirth,
      placeOfBirth,
      province,
      residenceIn,
      street,
      number,
      zipCode,
      gender,
      companyAffiliation,
      userId: req.user.id,
    });
    await newDiscente.save();
    res.status(201).json(newDiscente);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Errore durante la creazione del discente' });
  }
};

const updateDiscente = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const updatedDiscente = await Discente.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedDiscente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    res.status(200).json(updatedDiscente);
  } catch (error) {
    console.error("Errore durante l'aggiornamento del discente:", error);
    res
      .status(500)
      .json({ message: 'Errore durante aggiornamento del discente' });
  }
};

// Funzione per ottenere tutti i discenti
const getUserDiscentiById = async (req, res) => {
  const { id } = req.params;
  try {
    const discenti = await Discente.findOne({ _id: id }).populate('userId');
    res.status(200).json(discenti);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Errore durante il recupero dei discenti' });
  }
};
const getUserDiscenti = async (req, res) => {
  try {
    const discenti = await Discente.find({ userId: req.user.id }).populate(
      'userId',
      '-password'
    );
    res.status(200).json(discenti);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Errore durante il recupero dei discenti' });
  }
};
const getAllDiscenti = async (req, res) => {
  try {
    const discenti = await Discente.find().populate('userId');
    console.log('discenti: ', discenti);
    res.status(200).json(discenti);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Errore durante il recupero dei discenti' });
  }
};

const updateDiscentePatentNumber = async (req, res) => {
  const { id } = req.params;
  const { patentNumber } = req.body;

  try {
    // Check if patentNumber exists in the request
    if (!patentNumber) {
      return res
        .status(400)
        .json({ message: 'Il numero di patente è richiesto' });
    }

    // Find the kit type based on the given patent number
    const order = await Order.findOne({
      'orderItems.progressiveNumbers': patentNumber,
    }).populate('orderItems.productId');

    if (!order) {
      return res
        .status(404)
        .json({ message: 'Kit non trovato per il numero di patente fornito' });
    }
    console.log('order: ', order);
    console.log('orderItems: ', order?.orderItems);

    // Extract the type of kit associated with the given patent number
    const kitType = order.orderItems.find((item) =>
      item.progressiveNumbers.includes(patentNumber)
    ).productId.type;

    console.log('kitType: ', kitType);
    // Fetch the discente and check if they already have a patent number for the same type
    const discente = await Discente.findById(id);
    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    const hasMatchingPatentNumber = order.orderItems.some((orderItem) => {
      return orderItem.progressiveNumbers.some((number) =>
        discente.patentNumber.includes(number)
      );
    });

    if (hasMatchingPatentNumber) {
      return res.status(400).json({
        message: `Il discente ha già un numero di patente per il tipo di kit ${kitType}`,
      });
    }

    // Find the discente and push the new patent number to the array
    const updatedDiscente = await Discente.findByIdAndUpdate(
      id,
      { $push: { patentNumber: patentNumber } },
      { new: true, runValidators: true }
    );

    if (!updatedDiscente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    res.status(200).json(updatedDiscente);
  } catch (error) {
    res.status(500).json({
      message: "Errore durante l'aggiornamento del numero di patente",
    });
  }
};

const searchDiscente = async (req, res) => {
  const { searchTerm } = req.query;
  
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ message: 'il termine di ricerca è obbligatorio' });
    }

    // Search by codiceFiscale or patentNumber
    const discenti = await Discente.find({
      $or: [
        { codiceFiscale: { $regex: new RegExp(searchTerm, 'i') } },
        { patentNumber: { $in: [searchTerm] } }
      ]
    }).populate('userId');
    
    res.status(200).json(discenti);
  } catch (error) {
    res.status(500).json({ message: 'Errore nella ricerca dei discenti' });
  }
};

const associateDiscenteWithUser = async (req, res) => {
  const { discenteId } = req.body;
  
  try {
    // Find discente
    const discente = await Discente.findById(discenteId);
    
    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }
    
    // Check if discente is already associated with this user
    if (discente.userId && discente.userId.toString() === req.user.id) {
      return res.status(400).json({ message: 'Discente già associato' });
    }
    
    // Create a new discente associated with current user
    const newDiscente = new Discente({
      nome: discente.nome,
      cognome: discente.cognome,
      codiceFiscale: discente.codiceFiscale,
      indirizzo: discente.indirizzo,
      città: discente.città,
      regione: discente.regione,
      email: discente.email,
      telefono: discente.telefono,
      patentNumber: discente.patentNumber,
      dateOfBirth: discente.dateOfBirth,
      placeOfBirth: discente.placeOfBirth,
      province: discente.province,
      residenceIn: discente.residenceIn,
      street: discente.street,
      number: discente.number,
      zipCode: discente.zipCode,
      gender: discente.gender,
      companyAffiliation: discente.companyAffiliation,
      userId: req.user.id
    });
    
    await newDiscente.save();
    
    res.status(200).json({ message: 'Discente aggiunto alla tua lista', discente: newDiscente });
  } catch (error) {
    res.status(500).json({ message: 'Errore di associazione del discente' });
  }
};

module.exports = {
  createDiscente,
  getAllDiscenti,
  getUserDiscenti,
  updateDiscente,
  getUserDiscentiById,
  updateDiscentePatentNumber,
  searchDiscente,
  associateDiscenteWithUser
};
