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
    // Check if discente with this fiscal code already exists for this user
    const existingDiscente = await Discente.findOne({
      codiceFiscale: codiceFiscale,
      userId: req.user.id
    });

    if (existingDiscente) {
      return res.status(400).json({
        message: 'Codice fiscale già inserito, si prega di ricontrollare.'
      });
    }

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
    console.log('error: ', error);
    
    // Handle MongoDB duplicate key error specifically
    if (error.code === 11000) {
      // Check which field caused the duplicate
      if (error.keyPattern && error.keyPattern.codiceFiscale) {
        return res.status(400).json({
          message: 'codice fiscale già presente'
        });
      }
      return res.status(400).json({
        message: 'Dati duplicati non consentiti'
      });
    }
    
    res.status(500).json({ 
      message: 'Errore durante la creazione del discente' 
    });
  }
};

// const createDiscente = async (req, res) => {
//   const {
//     nome,
//     cognome,
//     codiceFiscale,
//     indirizzo,
//     città,
//     regione,
//     email,
//     telefono,
//     patentNumber,
//     dateOfBirth,
//     placeOfBirth,
//     province,
//     residenceIn,
//     street,
//     number,
//     zipCode,
//     gender,
//     companyAffiliation,
//   } = req.body;
//   try {
//     const newDiscente = new Discente({
//       nome,
//       cognome,
//       codiceFiscale,
//       indirizzo,
//       città,
//       regione,
//       email,
//       telefono,
//       patentNumber: patentNumber == null ? [] : patentNumber,
//       dateOfBirth,
//       placeOfBirth,
//       province,
//       residenceIn,
//       street,
//       number,
//       zipCode,
//       gender,
//       companyAffiliation,
//       userId: req.user.id,
//     });
//     await newDiscente.save();
//     res.status(201).json(newDiscente);
//   } catch (error) {
//     console.log('error: ', error);
//     res
//       .status(500)
//       .json({ message: 'Errore durante la creazione del discente' });
//   }
// };

const updateDiscente = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const cleanedFields = {};
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== null && updateFields[key] !== '') {
        cleanedFields[key] = updateFields[key];
      }
    });

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
  const { patentNumber, courseId, instructorId, centerId } = req.body;

  try {
    // Check if patentNumber and courseId exist in the request
    if (!patentNumber) {
      return res
        .status(400)
        .json({ message: 'Il numero di patente è richiesto' });
    }

    if (!courseId) {
      return res
        .status(400)
        .json({ message: 'L\'ID del corso è richiesto' });
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

    // Extract the type of kit associated with the given patent number
    const kitItem = order.orderItems.find((item) =>
      item.progressiveNumbers.includes(patentNumber)
    );
    const kitType = kitItem.productId.type;

    // Fetch the discente and check if they already have this kit number for this course
    const discente = await Discente.findById(id);
    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    // Check if this kit number is already assigned to this discente for this course
    const existingAssignment = discente.kitAssignments.find(
      (assignment) => 
        assignment.kitNumber === patentNumber && 
        assignment.courseId.toString() === courseId
    );

    if (existingAssignment) {
      return res.status(400).json({
        message: `Il discente ha già questo numero di kit (${patentNumber}) assegnato per questo corso`,
      });
    }

    // Check if this kit number is already assigned to this discente for any course of the same type
    const existingKitTypeAssignment = discente.kitAssignments.find(
      (assignment) => 
        assignment.kitNumber === patentNumber
    );

    if (existingKitTypeAssignment) {
      return res.status(400).json({
        message: `Questo numero di kit (${patentNumber}) è già stato assegnato a questo discente`,
      });
    }

    // Get course details for the assignment
    const Course = require('../models/Course');
    const course = await Course.findById(courseId)
      .populate('tipologia')
      .populate('userId')
      .populate('istruttore');

    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Get instructor details if provided
    let instructorName = '';
    if (instructorId) {
      const User = require('../models/User');
      const instructor = await User.findById(instructorId);
      if (instructor) {
        instructorName = `${instructor.firstName} ${instructor.lastName}`;
      }
    }

    // Get center details
    const center = course.userId;
    const centerName = center.role === 'center' ? center.name : `${center.firstName} ${center.lastName}`;

    // Create new kit assignment object
    const newKitAssignment = {
      kitNumber: patentNumber,
      courseId: courseId,
      courseName: course.tipologia?.type || 'Unknown Course',
      courseType: course.tipologia?.type || 'Unknown Type',
      instructorId: instructorId || null,
      instructorName: instructorName,
      centerId: center._id,
      centerName: centerName,
      assignedDate: new Date(),
      kitType: kitType
    };

    // Add the new kit assignment and also add to patentNumber array for backward compatibility
    const updatedDiscente = await Discente.findByIdAndUpdate(
      id,
      { 
        $push: { 
          kitAssignments: newKitAssignment,
          patentNumber: patentNumber 
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedDiscente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    res.status(200).json({
      message: 'Kit assegnato con successo',
      discente: updatedDiscente,
      kitAssignment: newKitAssignment
    });
  } catch (error) {
    console.error('Error updating discente patent number:', error);
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

// Get kit assignments for a specific discente and course
const getDiscenteKitAssignments = async (req, res) => {
  const { discenteId, courseId } = req.params;
  
  try {
    const discente = await Discente.findById(discenteId)
      .populate('kitAssignments.courseId', 'tipologia progressiveNumber')
      .populate('kitAssignments.instructorId', 'firstName lastName')
      .populate('kitAssignments.centerId', 'name firstName lastName');

    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    let kitAssignments = discente.kitAssignments;

    // Filter by course if courseId is provided
    if (courseId) {
      kitAssignments = kitAssignments.filter(
        assignment => assignment.courseId.toString() === courseId
      );
    }

    res.status(200).json({
      discente: {
        _id: discente._id,
        nome: discente.nome,
        cognome: discente.cognome,
        codiceFiscale: discente.codiceFiscale
      },
      kitAssignments
    });
  } catch (error) {
    console.error('Error fetching kit assignments:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle assegnazioni kit' });
  }
};

// Remove a kit assignment from a discente
const removeKitAssignment = async (req, res) => {
  const { discenteId, assignmentId } = req.params;
  
  try {
    const discente = await Discente.findById(discenteId);
    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    // Find the kit assignment to remove
    const assignmentToRemove = discente.kitAssignments.id(assignmentId);
    if (!assignmentToRemove) {
      return res.status(404).json({ message: 'Assegnazione kit non trovata' });
    }

    const kitNumber = assignmentToRemove.kitNumber;

    // Remove from kitAssignments array
    discente.kitAssignments.pull(assignmentId);

    // Also remove from patentNumber array for backward compatibility
    discente.patentNumber = discente.patentNumber.filter(num => num !== kitNumber);

    await discente.save();

    res.status(200).json({
      message: 'Assegnazione kit rimossa con successo',
      discente
    });
  } catch (error) {
    console.error('Error removing kit assignment:', error);
    res.status(500).json({ message: 'Errore durante la rimozione dell\'assegnazione kit' });
  }
};

// Get all kit assignments for a course
const getCourseKitAssignments = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const discenti = await Discente.find({
      'kitAssignments.courseId': courseId
    }).populate({
      path: 'kitAssignments',
      match: { courseId: courseId },
      populate: [
        { path: 'courseId', select: 'tipologia progressiveNumber' },
        { path: 'instructorId', select: 'firstName lastName' },
        { path: 'centerId', select: 'name firstName lastName' }
      ]
    });

    const assignments = discenti.map(discente => ({
      discente: {
        _id: discente._id,
        nome: discente.nome,
        cognome: discente.cognome,
        codiceFiscale: discente.codiceFiscale
      },
      kitAssignments: discente.kitAssignments.filter(
        assignment => assignment.courseId.toString() === courseId
      )
    })).filter(item => item.kitAssignments.length > 0);

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching course kit assignments:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle assegnazioni kit del corso' });
  }
};

// Migration function to convert existing patentNumbers to kitAssignments
const migratePatentNumbersToKitAssignments = async (req, res) => {
  try {
    const discenti = await Discente.find({ 
      patentNumber: { $exists: true, $ne: [] },
      kitAssignments: { $size: 0 } // Only migrate if no kit assignments exist
    });

    let migratedCount = 0;

    for (const discente of discenti) {
      const Course = require('../models/Course');
      
      // Find courses where this discente is enrolled
      const courses = await Course.find({ 
        discente: discente._id 
      }).populate('tipologia').populate('userId');

      for (const patentNumber of discente.patentNumber) {
        // Find the order containing this patent number
        const order = await Order.findOne({
          'orderItems.progressiveNumbers': patentNumber,
        }).populate('orderItems.productId');

        if (order) {
          const kitItem = order.orderItems.find((item) =>
            item.progressiveNumbers.includes(patentNumber)
          );

          if (kitItem) {
            // Try to match with a course of the same kit type
            const matchingCourse = courses.find(course => 
              course.tipologia._id.toString() === kitItem.productId._id.toString()
            );

            if (matchingCourse) {
              const center = matchingCourse.userId;
              const centerName = center.role === 'center' ? center.name : `${center.firstName} ${center.lastName}`;

              const newKitAssignment = {
                kitNumber: patentNumber,
                courseId: matchingCourse._id,
                courseName: matchingCourse.tipologia?.type || 'Unknown Course',
                courseType: matchingCourse.tipologia?.type || 'Unknown Type',
                instructorId: null,
                instructorName: '',
                centerId: center._id,
                centerName: centerName,
                assignedDate: new Date(),
                kitType: kitItem.productId.type
              };

              discente.kitAssignments.push(newKitAssignment);
            }
          }
        }
      }

      if (discente.kitAssignments.length > 0) {
        await discente.save();
        migratedCount++;
      }
    }

    res.status(200).json({
      message: `Migrazione completata. ${migratedCount} discenti migrati.`,
      migratedCount
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ message: 'Errore durante la migrazione' });
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
  associateDiscenteWithUser,
  getDiscenteKitAssignments,
  removeKitAssignment,
  getCourseKitAssignments,
  migratePatentNumbersToKitAssignments
};
