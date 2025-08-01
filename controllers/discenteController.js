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
      userId: req.user.id,
    });

    if (existingDiscente) {
      return res.status(400).json({
        message: 'Codice fiscale già inserito, si prega di ricontrollare.',
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
          message: 'codice fiscale già presente',
        });
      }
      return res.status(400).json({
        message: 'Dati duplicati non consentiti',
      });
    }

    res.status(500).json({
      message: 'Errore durante la creazione del discente',
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
    // Check if discente exists
    const existingDiscente = await Discente.findById(id);
    if (!existingDiscente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    // If user is not admin, check if they own this discente
    if (
      req.user.role !== 'admin' &&
      existingDiscente.userId.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: 'Non autorizzato ad aggiornare questo discente' });
    }

    // Check for duplicate codiceFiscale if it's being updated
    if (
      updateFields.codiceFiscale &&
      updateFields.codiceFiscale !== existingDiscente.codiceFiscale
    ) {
      const duplicateDiscente = await Discente.findOne({
        codiceFiscale: updateFields.codiceFiscale,
        _id: { $ne: id },
      });

      if (duplicateDiscente) {
        return res.status(400).json({
          message: 'Codice fiscale già esistente per un altro discente',
        });
      }
    }

    // Clean up empty values
    const cleanedFields = {};
    Object.keys(updateFields).forEach((key) => {
      if (
        updateFields[key] !== null &&
        updateFields[key] !== undefined &&
        updateFields[key] !== ''
      ) {
        cleanedFields[key] = updateFields[key];
      }
    });

    // Update the discente
    const updatedDiscente = await Discente.findByIdAndUpdate(
      id,
      { $set: cleanedFields },
      { new: true, runValidators: true }
    ).populate('userId', '-password');

    res.status(200).json({
      message: 'Discente aggiornato con successo',
      discente: updatedDiscente,
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento del discente:", error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        message: 'Errori di validazione',
        errors: validationErrors,
      });
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.codiceFiscale) {
        return res.status(400).json({
          message: 'Codice fiscale già presente',
        });
      }
    }

    res.status(500).json({
      message: 'Errore durante aggiornamento del discente',
    });
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
      return res.status(400).json({ message: "L'ID del corso è richiesto" });
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

    // Check if this discente already has a kit number assigned for this specific course
    const existingCourseAssignment = discente.kitAssignments.find(
      (assignment) => assignment.courseId.toString() === courseId && assignment.kitNumber && assignment.kitNumber.trim() !== ''
    );

    if (existingCourseAssignment) {
      return res.status(400).json({
        message: `Il discente ha già un kit (${existingCourseAssignment.kitNumber}) assegnato per questo corso. Un discente può avere solo un kit per corso.`,
      });
    }

    // Check if this specific kit number is already assigned to any other discente
    const existingKitAssignment = await Discente.findOne({
      'kitAssignments.kitNumber': patentNumber,
    });

    if (existingKitAssignment && existingKitAssignment._id.toString() !== id) {
      return res.status(400).json({
        message: `Questo numero di kit (${patentNumber}) è già stato assegnato a un altro discente`,
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

    // Check if the course allows kit assignment based on its status
    if (!['active', 'unactive', 'update'].includes(course.status)) {
      return res.status(400).json({
        message: `Impossibile assegnare kit. Il corso ha stato: ${course.status}. I kit possono essere assegnati solo per corsi con stato: active, unactive, o update.`,
      });
    }

    // Check if the discente is actually enrolled in this course
    if (!course.discente.includes(id)) {
      return res.status(400).json({
        message: 'Il discente non è iscritto a questo corso',
      });
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
    const centerName =
      center.role === 'center'
        ? center.name
        : `${center.firstName} ${center.lastName}`;

    // Check if there's already a tracking assignment for this course (without kit number)
    const existingTrackingAssignment = discente.kitAssignments.find(
      (assignment) => assignment.courseId.toString() === courseId && (!assignment.kitNumber || assignment.kitNumber.trim() === '')
    );

    let updatedDiscente;
    let assignmentResult;

    if (existingTrackingAssignment) {
      // Update the existing tracking assignment with the kit number
      existingTrackingAssignment.kitNumber = patentNumber;
      existingTrackingAssignment.instructorId = instructorId || existingTrackingAssignment.instructorId;
      existingTrackingAssignment.instructorName = instructorName || existingTrackingAssignment.instructorName;
      
      // Add to patentNumber array for backward compatibility
      discente.patentNumber.push(patentNumber);
      
      updatedDiscente = await discente.save();
      assignmentResult = existingTrackingAssignment;
    } else {
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
        kitType: kitType,
      };

      // Add the new kit assignment and also add to patentNumber array for backward compatibility
      updatedDiscente = await Discente.findByIdAndUpdate(
        id,
        {
          $push: {
            kitAssignments: newKitAssignment,
            patentNumber: patentNumber,
          },
        },
        { new: true, runValidators: true }
      );
      assignmentResult = newKitAssignment;
    }

    if (!updatedDiscente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    res.status(200).json({
      message: 'Kit assegnato con successo',
      discente: updatedDiscente,
      kitAssignment: assignmentResult,
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
      return res
        .status(400)
        .json({ message: 'il termine di ricerca è obbligatorio' });
    }

    // Search by codiceFiscale or patentNumber
    const discenti = await Discente.find({
      $or: [
        { codiceFiscale: { $regex: new RegExp(searchTerm, 'i') } },
        { patentNumber: { $in: [searchTerm] } },
      ],
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
        (assignment) => assignment.courseId.toString() === courseId
      );
    }

    res.status(200).json({
      discente: {
        _id: discente._id,
        nome: discente.nome,
        cognome: discente.cognome,
        codiceFiscale: discente.codiceFiscale,
      },
      kitAssignments,
    });
  } catch (error) {
    console.error('Error fetching kit assignments:', error);
    res
      .status(500)
      .json({ message: 'Errore durante il recupero delle assegnazioni kit' });
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
    discente.patentNumber = discente.patentNumber.filter(
      (num) => num !== kitNumber
    );

    await discente.save();

    res.status(200).json({
      message: 'Assegnazione kit rimossa con successo',
      discente,
    });
  } catch (error) {
    console.error('Error removing kit assignment:', error);
    res
      .status(500)
      .json({ message: "Errore durante la rimozione dell'assegnazione kit" });
  }
};

// Get all kit assignments for a course
const getCourseKitAssignments = async (req, res) => {
  const { courseId } = req.params;

  try {
    const discenti = await Discente.find({
      'kitAssignments.courseId': courseId,
    }).populate({
      path: 'kitAssignments',
      match: { courseId: courseId },
      populate: [
        { path: 'courseId', select: 'tipologia progressiveNumber' },
        { path: 'instructorId', select: 'firstName lastName' },
        { path: 'centerId', select: 'name firstName lastName' },
      ],
    });

    const assignments = discenti
      .map((discente) => ({
        discente: {
          _id: discente._id,
          nome: discente.nome,
          cognome: discente.cognome,
          codiceFiscale: discente.codiceFiscale,
        },
        kitAssignments: discente.kitAssignments.filter(
          (assignment) => assignment.courseId.toString() === courseId
        ),
      }))
      .filter((item) => item.kitAssignments.length > 0);

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching course kit assignments:', error);
    res.status(500).json({
      message: 'Errore durante il recupero delle assegnazioni kit del corso',
    });
  }
};

// Migration function to convert existing patentNumbers to kitAssignments
const migratePatentNumbersToKitAssignments = async (req, res) => {
  try {
    const discenti = await Discente.find({
      patentNumber: { $exists: true, $ne: [] },
      kitAssignments: { $size: 0 }, // Only migrate if no kit assignments exist
    });

    let migratedCount = 0;

    for (const discente of discenti) {
      const Course = require('../models/Course');

      // Find courses where this discente is enrolled
      const courses = await Course.find({
        discente: discente._id,
      })
        .populate('tipologia')
        .populate('userId');

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
            const matchingCourse = courses.find(
              (course) =>
                course.tipologia._id.toString() ===
                kitItem.productId._id.toString()
            );

            if (matchingCourse) {
              const center = matchingCourse.userId;
              const centerName =
                center.role === 'center'
                  ? center.name
                  : `${center.firstName} ${center.lastName}`;

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
                kitType: kitItem.productId.type,
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
      migratedCount,
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
      return res
        .status(400)
        .json({ message: 'Discente già associato a questo account' });
    }

    // Check if a discente with the same fiscal code already exists for this user
    const existingDiscente = await Discente.findOne({
      codiceFiscale: discente.codiceFiscale,
      userId: req.user.id,
    });

    if (existingDiscente) {
      return res.status(400).json({
        message:
          'Un discente con questo codice fiscale è già presente nella tua lista',
      });
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
      userId: req.user.id,
    });

    await newDiscente.save();

    res.status(200).json({
      message: 'Discente aggiunto alla tua lista',
      discente: newDiscente,
    });
  } catch (error) {
    console.error('Error associating discente:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.codiceFiscale) {
        return res.status(400).json({
          message:
            'Un discente con questo codice fiscale è già presente nella tua lista',
        });
      }
    }

    res.status(500).json({ message: 'Errore di associazione del discente' });
  }
};

// Check if a discente can be assigned a kit for a specific course
const canAssignKitToDiscente = async (req, res) => {
  const { discenteId, courseId } = req.params;

  try {
    const discente = await Discente.findById(discenteId);
    if (!discente) {
      return res.status(404).json({ message: 'Discente non trovato' });
    }

    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Check if discente already has a kit for this course
    const existingAssignment = discente.kitAssignments.find(
      (assignment) => assignment.courseId.toString() === courseId
    );

    if (existingAssignment) {
      return res.status(200).json({
        canAssign: false,
        reason: 'Il discente ha già un kit assegnato per questo corso',
        existingKit: existingAssignment.kitNumber,
      });
    }

    // Check course status - if it's active, allow assignment
    if (['active', 'unactive', 'update'].includes(course.status)) {
      return res.status(200).json({
        canAssign: true,
        reason: 'Il corso è attivo e il discente può ricevere un kit',
      });
    }

    // If course is completed/ended, allow assignment only if discente doesn't have active assignments for other courses
    if (['end', 'complete', 'finalUpdate'].includes(course.status)) {
      // Check for active courses with kit assignments
      const activeCourses = await Course.find({
        discente: discenteId,
        status: { $in: ['active', 'unactive', 'update'] },
      });

      const hasActiveKitAssignments = discente.kitAssignments.some(
        (assignment) =>
          activeCourses.some(
            (activeCourse) =>
              activeCourse._id.toString() === assignment.courseId.toString()
          )
      );

      if (hasActiveKitAssignments) {
        return res.status(200).json({
          canAssign: false,
          reason: 'Il discente ha ancora kit assegnati per corsi attivi',
        });
      }

      return res.status(200).json({
        canAssign: true,
        reason: 'Il discente può ricevere un nuovo kit per questo corso',
      });
    }

    return res.status(200).json({
      canAssign: false,
      reason: 'Stato del corso non valido per assegnazione kit',
    });
  } catch (error) {
    console.error('Error checking kit assignment eligibility:', error);
    res.status(500).json({
      message: "Errore durante la verifica dell'idoneità all'assegnazione kit",
    });
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
  migratePatentNumbersToKitAssignments,
  canAssignKitToDiscente,
};
