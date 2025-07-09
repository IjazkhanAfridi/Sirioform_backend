const Order = require('../models/Order');
const Kit = require('../models/Kit');
const Course = require('../models/Course');
const { createNotification } = require('../utils/notificationService');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');
const Discente = require('../models/Discente');
const generateCertificate = require('../utils/generateCertificate');
const sendEmail = require('../utils/emailService');
const path = require('path');
const archiver = require('archiver');
const CourseType = require('../models/CourseType');
const fs = require('fs');

// Funzione per creare un nuovo corso
const createCourse = async (req, res) => {
  const {
    tipologia,
    città,
    via,
    presso,
    provincia,
    region,
    zipcode,
    numeroDiscenti,
    istruttori,
    direttoriCorso,
    giornate,
    isRefreshCourse,
  } = req.body;

  try {
    // Find the user's orders that contain the kit matching the course's tipologia
    const userOrders = await Order.find({
      userId: req.user.id,
      'orderItems.productId': tipologia,
    }).populate('userId');
    console.log('userOrders: ', userOrders);
    if (!userOrders.length) {
      return res
        .status(400)
        .json({ message: `Nessun kit trovato per l'utente` });
    }
    let totalAvailableQuantity = 0;
    let selectedOrderItem = null;

    userOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.productId.toString() === tipologia) {
          totalAvailableQuantity += item.quantity;
          selectedOrderItem = item;
        }
      });
    });

    // Check if the available quantity is enough
    if (numeroDiscenti > totalAvailableQuantity) {
      return res.status(400).json({
        message: 'Non si dispone di abbastanza kit per creare il corso!',
      });
    }

    // Create the course
    const newCourse = new Course({
      tipologia,
      città,
      via,
      presso,
      provincia,
      region,
      zipcode,
      numeroDiscenti,
      istruttore: istruttori,
      direttoreCorso: direttoriCorso,
      giornate,
      userId: req.user.id,
      isRefreshCourse,
    });

    const createdCourse = await newCourse.save();

    await createNotification({
      message: `${
        req.user.role == 'center'
          ? userOrders[0]?.userId?.name
          : userOrders[0]?.userId?.firstName +
            ' ' +
            userOrders[0]?.userId?.lastName
      } ha creato un nuovo ${
        isRefreshCourse == true ? ' Refresh ' : ''
      } corso di aggiornamento.`,
      senderId: req.user.id,
      category: 'general',
      isAdmin: true,
    });

    // Update the order kit quantity
    let remainingQuantity = numeroDiscenti;

    for (const order of userOrders) {
      for (const item of order.orderItems) {
        if (item.productId.toString() === tipologia && remainingQuantity > 0) {
          const usedQuantity = Math.min(item.quantity, remainingQuantity);

          if (item.totalQuantity == null) {
            item.totalQuantity = item.quantity;
          }
          item.quantity -= usedQuantity;
          remainingQuantity -= usedQuantity;

          // Save the updated order with reduced quantity
          await order.save();
        }
      }
    }

    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la creazione del corso' });
  }
};

// Funzione per ottenere tutti i corsi dell'utente
const getCoursesByUser = async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.user.id })
      .populate('direttoreCorso')
      .populate('istruttore')
      .populate('tipologia')
      .populate('discente');
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il recupero dei corsi' });
  }
};

const getAllDiscenteExpirationCourses = async (req, res) => {
  try {
    // Only admins can access this endpoint (additional security check)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: `Non autorizzato. Accesso consentito solo all'Amministratore`,
      });
    }

    // Get all courses with populated fields including user data
    const courses = await Course.find()
      .populate('tipologia')
      .populate('discente')
      .populate({
        path: 'userId',
        select: 'firstName lastName email name role', // Include relevant user fields
      })
      .populate('direttoreCorso')
      .populate('istruttore');

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({
      message: 'Errore durante il recupero dei corsi scaduti del discente',
    });
  }
};

const getDiscenteExpirations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let query = { status: 'complete' };

    if (userRole === 'instructor') {
      query.$or = [{ istruttore: userId }, { userId: userId }];
    } else if (userRole === 'center') {
      query.userId = userId;
    } else {
      return res.status(403).json({
        message: 'Ruolo non autorizzato per questa operazione',
      });
    }

    const courses = await Course.find(query)
      .populate('tipologia')
      .populate('discente')
      .populate({
        path: 'userId',
        select: 'firstName lastName email name role',
      })
      .populate('direttoreCorso')
      .populate('istruttore')
      .lean();

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching role-based discente expirations:', error);
    res.status(500).json({
      message: 'Errore durante il recupero dei corsi scaduti del discente',
    });
  }
};

const getCoursesByDiscenteId = async (req, res) => {
  try {
    const discenteId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(discenteId)) {
      return res
        .status(400)
        .json({ message: 'Format invalido per il discente' });
    }

    let query;
    if (req.user.role === 'admin') {
      query = { 
        discente: { $in: [discenteId] } 
      };
    } else {
      query = { 
        userId: req.user.id, 
        discente: { $in: [discenteId] } 
      };
    }

    const courses = await Course.find(query)
    .populate('tipologia')
    .populate('discente');
    console.log('courses: ', courses);

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il recupero dei corsi' });
  }
};

// const getCoursesByDiscenteId = async (req, res) => {
//   try {
//     const discenteId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(discenteId)) {
//       return res.status(400).json({ message: 'Invalid discenteId format' });
//     }

//     const courses = await Course.find({
//       userId: req.user.id,
//       discente: discenteId,
//     })
//       .populate('tipologia')
//       .populate('discente');

//     res.status(200).json(courses);
//   } catch (error) {
//     res.status(500).json({ message: 'Errore durante il recupero dei corsi' });
//   }
// };

const getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const courses = await Course.findOne({ _id: id }).populate('tipologia');
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il recupero dei corsi' });
  }
};

const getSingleCourseById = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the course and populate its related fields
    const course = await Course.findOne({ _id: id })
      .populate('discente')
      .populate('direttoreCorso')
      .populate('istruttore')
      .populate('tipologia');

    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Find all orders that contain the related kits for this course's tipologia
    const orders = await Order.find({
      userId: course.userId,
      'orderItems.productId': course.tipologia,
    });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: `Ordini non trovati per quest'ordine` });
    }

    // Collect all progressive numbers from each matching order item
    let allProgressiveNumbers = [];
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.productId.toString() === course.tipologia._id.toString()) {
          allProgressiveNumbers = allProgressiveNumbers.concat(
            item.progressiveNumbers
          );
        }
      });
    });

    // Fetch all discenti who have a patentNumber
    const discentiWithPatent = await Discente.find({
      patentNumber: { $exists: true, $ne: [] },
    });

    // Flatten all patent numbers from all discenti into a single array
    const assignedProgressiveNumbers = discentiWithPatent.flatMap(
      (discente) => discente.patentNumber
    );

    // Filter out the progressive numbers that have already been assigned
    const availableProgressiveNumbers = allProgressiveNumbers.filter(
      (number) => !assignedProgressiveNumbers.includes(number)
    );

    // Return the course details along with the progressive numbers of kits
    res.status(200).json({
      course,
      progressiveNumbers: availableProgressiveNumbers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course' });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('direttoreCorso')
      .populate('tipologia')
      .populate('userId')
      .populate('discente')
      .populate('istruttore');
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Errore durante il recupero dei corsi' });
  }
};

const uploadReportDocument = async (req, res) => {
  const { courseId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Nessun file caricato' });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    course.reportDocument = file.path;
    await course.save();

    res
      .status(200)
      .json({ message: 'Documento Report caricato con successo', course });
  } catch (error) {
    console.error('Errore di caricamento del documento', error);
    res.status(500).json({ message: 'Errore di caricamento del documento' });
  }
};

const updateCourseStatus = async (req, res) => {
  const { courseId } = req.params;
  const { status } = req.body;

  try {
    if (
      ![
        'active',
        'unactive',
        'update',
        'end',
        'complete',
        'finalUpdate',
      ].includes(status)
    ) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find the course with the provided ID and populate necessary fields
    const course = await Course.findById(courseId).populate(
      'tipologia discente userId'
    );
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    if (status === 'end') {
      if (!course.reportDocument) {
        return res.status(400).json({
          message:
            'é necessario caricare il documento del Verbale prima di concludere il corso',
        });
      }
      // Find all orders that have the course's tipologia in their order items
      const orders = await Order.find({
        'orderItems.productId': course?.tipologia?._id,
        userId: course.userId, // Ensure the order belongs to the course's user
      }).populate('orderItems.productId');

      if (!orders.length) {
        return res.status(404).json({
          message: 'Kit non trovato per il numero di patente fornito',
        });
      }

      // Collect all progressiveNumbers from all relevant order items
      const allProgressiveNumbers = orders
        .flatMap((order) => order.orderItems)
        .filter(
          (item) =>
            item.productId._id.toString() === course.tipologia._id.toString()
        )
        .flatMap((item) => item.progressiveNumbers);

      // Check if every student has at least one patent number in the aggregated list
      const allDiscentesHaveMatch = course.discente.every((discente) =>
        discente.patentNumber.some((patentNum) =>
          allProgressiveNumbers.includes(patentNum)
        )
      );

      if (!allDiscentesHaveMatch) {
        return res.status(400).json({
          message: `Bisogna associare un kit tipo ${course.tipologia.type} ad ogni studente prima di terminare il corso.`,
        });
      }
    }

    if (status === 'complete') {
      const certificates = [];
      for (const discente of course.discente) {
        const filePath = await generateCertificate(discente, course);
        certificates.push({
          discenteId: discente._id,
          certificatePath: filePath,
        });
      }
      course.certificates = certificates;
    }

    // Update the course status
    course.status = status;
    await course.save();

    // Create notification based on the updated status
    await createNotification(
      req?.user?.role === 'admin'
        ? {
            message: `${
              status === 'update' || status === 'finalUpdate'
                ? `L'amministratore richiede delle modifiche al corso ${course?.tipologia?.type} .`
                : `Lo stato del tuo corso ${course?.tipologia?.type} è cambiato.`
            }`,
            senderId: req.user.id,
            category: 'general',
            receiverId: course?.userId,
          }
        : {
            message: `${
              status === 'end' &&
              `${
                req.user.role === 'center'
                  ? course?.userId?.name
                  : course?.userId?.firstName + ' ' + course?.userId?.lastName
              } vuole concludere il corso ${course?.tipologia?.type} .`
            }`,
            senderId: req.user.id,
            category: 'general',
            isAdmin: true,
          }
    );

    res.status(200).json(course);
  } catch (error) {
    res
      .status(500)
      .json({ message: `errore nell'aggiornamento dello stato del corso` });
  }
};

const assignDescente = async (req, res) => {
  try {
    const { courseId, discenteId } = req.body;
    if (!courseId || !discenteId) {
      return res
        .status(400)
        .json({ error: `Sono richiesti l'ID del corso e del discente` });
    }
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(discenteId)
    ) {
      return res.status(400).json({ error: `Id corso e discente errati ` });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'corso non trovato' });
    }
    if (course.discente.includes(discenteId)) {
      return res
        .status(400)
        .json({ error: 'Il discente è già stato assegnato a questo corso!' });
    }
    if (course.discente.length >= Number(course.numeroDiscenti)) {
      return res.status(400).json({
        error: `Hai gia assegnato ${course.numeroDiscenti} discenti`,
      });
    }
    course.discente.push(discenteId);
    await course.save();
    res
      .status(200)
      .json({ message: 'Discente assegnato con successo!', course });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const removeDiscente = async (req, res) => {
  const { courseId, discenteId } = req.body;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    course.discente.pull(discenteId);
    await course.save();
    res.status(200).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    // Find the course by ID before deleting
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    const userOrders = await Order.find({
      userId: course.userId,
      'orderItems.productId': course.tipologia,
    });

    if (!userOrders.length) {
      return res
        .status(400)
        .json({ message: 'Ordini non trovati per questo utente' });
    }

    // Return remaining kits to the user's order
    let remainingDiscenti = course.numeroDiscenti;

    for (const order of userOrders) {
      for (const item of order.orderItems) {
        if (
          item.productId.toString() === course.tipologia.toString() &&
          remainingDiscenti > 0
        ) {
          const addedQuantity = Math.min(
            item.totalQuantity - item.quantity,
            remainingDiscenti
          );
          item.quantity += addedQuantity;
          remainingDiscenti -= addedQuantity;

          // Save the updated order with increased kit quantity
          await order.save();
        }
      }
    }

    // After returning the kits, delete the course
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res
        .status(404)
        .json({ message: `Corso non trovato dopo l'eliminazione` });
    }

    res.status(200).json({
      message: `corso eliminato con successo. I kit sono di nuovo disponibili`,
    });
  } catch (error) {
    res.status(500).json({ message: `Errore nell'eliminazione del corso` });
  }
};

const updateCourse = async (req, res) => {
  const { courseId } = req.params;
  const {
    città,
    via,
    presso,
    provincia,
    region,
    zipcode,
    numeroDiscenti,
    istruttori,
    direttoriCorso,
    giornate,
  } = req.body;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ message: `Errore nell'eliminazione del corso` });
    }

    // Fetch the user's orders for the kit used in this course
    const userOrders = await Order.find({
      userId: req.user.id,
      'orderItems.productId': course?.tipologia,
    }).populate('userId');

    console.log('userOrders: ', userOrders);
    console.log('userOrders[0]?.userId?.name : ', userOrders[0]?.userId?.name);

    if (!userOrders.length) {
      return res
        .status(400)
        .json({ message: `Nessun kit trovato per l'utente` });
    }

    // Calculate the total available quantity of kits
    let totalAvailableQuantity = 0;
    userOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.productId.toString() === course.tipologia.toString()) {
          totalAvailableQuantity += item.quantity;
        }
      });
    });

    // Calculate the current kits used in the course
    const currentUsedKits = course.numeroDiscenti;

    // If the new numeroDiscenti is provided, calculate the difference
    if (numeroDiscenti !== undefined) {
      const difference = numeroDiscenti - currentUsedKits;

      // Check if increasing the number of discenti exceeds the available kits
      if (difference > totalAvailableQuantity) {
        return res.status(400).json({
          message: 'Non si dispone di abbastanza kit di aggiornamento',
        });
      }

      // Update numeroDiscenti
      course.numeroDiscenti = numeroDiscenti;

      // Update the kit quantities in user orders accordingly
      let remainingDifference = difference;
      for (const order of userOrders) {
        for (const item of order.orderItems) {
          if (
            item.productId.toString() === course.tipologia.toString() &&
            remainingDifference > 0
          ) {
            const usedQuantity = Math.min(item.quantity, remainingDifference);
            item.quantity -= usedQuantity;
            remainingDifference -= usedQuantity;
            await order.save();
          }
        }
      }
    }

    // Update other fields if provided
    if (città !== undefined) course.città = città;
    if (via !== undefined) course.via = via;
    if (presso !== undefined) course.presso = presso;
    if (provincia !== undefined) course.provincia = provincia;
    if (region !== undefined) course.region = region;
    if (zipcode !== undefined) course.zipcode = zipcode;
    if (istruttori !== undefined) course.istruttore = istruttori;
    if (direttoriCorso !== undefined) course.direttoreCorso = direttoriCorso;
    if (giornate !== undefined) course.giornate = giornate;

    // Save the updated course
    const updatedCourse = await course.save();
    await createNotification({
      message: `${
        req?.user?.role == 'center'
          ? userOrders[0]?.userId?.name
          : userOrders[0]?.userId?.firstName +
            ' ' +
            userOrders[0]?.userId?.lastName
      } ha aggiornato il corso.`,
      senderId: req.user.id,
      category: 'general',
      isAdmin: true,
    });
    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: 'Errore di aggiornamento per il corso' });
  }
};

const addCourseQuantity = async (req, res) => {
  const { courseId } = req.params;
  const { numeroDiscenti } = req.body;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Fetch the user's orders for the kit used in this course
    const userOrders = await Order.find({
      userId: req.user.id,
      'orderItems.productId': course?.tipologia,
    }).populate('userId');

    if (!userOrders.length) {
      return res
        .status(400)
        .json({ message: `Nessun kit trovato per l'utente` });
    }

    // Calculate the total available quantity of kits
    let totalAvailableQuantity = 0;
    userOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.productId.toString() === course.tipologia.toString()) {
          totalAvailableQuantity += item.quantity;
        }
      });
    });

    // Calculate the current kits used in the course
    const currentUsedKits = course.numeroDiscenti;

    // Calculate the difference to check if quantity can be increased
    const difference = numeroDiscenti;
    if (difference <= 0) {
      return res
        .status(400)
        .json({ message: `può essere aggiunta solo una quantità ulteriore` });
    }

    // Ensure the additional quantity does not exceed available kits
    if (difference > totalAvailableQuantity) {
      return res.status(400).json({
        message: 'Non si dispone di abbastanza kit per aumentare la quantità',
      });
    }

    // Update numeroDiscenti
    course.numeroDiscenti += Number(numeroDiscenti);

    // Deduct the added quantity from user orders
    let remainingDifference = difference;
    for (const order of userOrders) {
      for (const item of order.orderItems) {
        if (
          item.productId.toString() === course.tipologia.toString() &&
          remainingDifference > 0
        ) {
          const usedQuantity = Math.min(item.quantity, remainingDifference);
          item.quantity -= usedQuantity;
          remainingDifference -= usedQuantity;
          await order.save();
        }
      }
    }

    // Save the updated course
    const updatedCourse = await course.save();

    // Send notification (optional)
    await createNotification({
      message: `${
        req.user.role == 'center'
          ? userOrders[0]?.userId?.name
          : userOrders[0]?.userId?.firstName +
            ' ' +
            userOrders[0]?.userId?.lastName
      } Ha aggiunto quantità al corso.`,
      senderId: req.user.id,
      category: 'general',
      isAdmin: true,
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: `Errore nell'aggiunta della quantità` });
  }
};

const sendCertificateToDiscente = async (req, res) => {
  const { courseId, discenteId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'corso non trovato' });
    }

    const certificate = course.certificates.find(
      (cert) => cert.discenteId.toString() === discenteId
    );
    if (!certificate) {
      return res
        .status(404)
        .json({ message: `Certificato non trovato per questo discente` });
    }

    const filePath = path.join(__dirname, '..', certificate.certificatePath);

    // Send the certificate file to the user
    res.download(filePath, `${discenteId}-certificate.pdf`);
  } catch (error) {
    res.status(500).json({ message: 'Errore di invio del certificato' });
  }
};

// const sendCertificate =async (req, res) => {
//   const { courseId, recipients, subject, message } = req.body;

//   try {
//     // Find the course and its discenti
//     const course = await Course.findById(courseId).populate('discente');
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }

//     // Determine recipients
//     let recipientEmails = [];
//     if (recipients === 'all') {
//       // Get all emails of discenti
//       recipientEmails = course.discente.map(d => d.email);
//     } else if (Array.isArray(recipients)) {
//       // Validate and include only specific discenti emails
//       recipientEmails = course.discente
//         .filter(d => recipients.includes(d._id.toString()))
//         .map(d => d.email);
//     }

//     if (recipientEmails.length === 0) {
//       return res.status(400).json({ message: 'No valid recipients found' });
//     }

//     // Send emails
//     recipientEmails.forEach(email => {
//       sendEmail(email, subject, message);
//     });

//     res.status(200).json({ message: 'Emails sent successfully' });
//   } catch (error) {
//     console.error('Error sending emails:', error);
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// }

const sendCertificate = async (req, res) => {
  const { courseId, recipients, subject, message } = req.body;

  try {
    // Find the course and populate certificates and discenti
    const course = await Course.findById(courseId).populate('discente');
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Determine recipients
    let selectedDiscenti = [];
    if (recipients === 'all') {
      selectedDiscenti = course.discente; // All discenti
    } else if (Array.isArray(recipients)) {
      selectedDiscenti = course.discente.filter((d) =>
        recipients.includes(d._id.toString())
      );
    }

    if (selectedDiscenti.length === 0) {
      return res
        .status(400)
        .json({ message: 'nessun destinatario valido trovato' });
    }

    // Loop through selected discenti
    for (const discente of selectedDiscenti) {
      // Find the correct certificate for this course and this discente
      const certificate = course.certificates.find(
        (cert) =>
          cert?.discenteId?.toString() === discente?._id?.toString() &&
          cert?.courseId?.toString() === courseId // Match by course ID
      );

      if (certificate) {
        const certificatePath = path.join(
          __dirname,
          '..',
          'uploads',
          'certificate',
          certificate.certificatePath
        );
        const certificateLink = `${req.protocol}://${req.get(
          'host'
        )}/uploads/certificate/${certificate.certificatePath}`;

        // Send email with the attachment and link
        await sendEmail({
          to: discente.email,
          subject: 'certificato di completamento',
          text: `${message}\n\nCertificato di completamento del corso: ${certificateLink}`,
          attachments: [
            {
              filename: path.basename(certificatePath),
              path: certificatePath, // Absolute path of the certificate
            },
          ],
        });
      } else {
        console.warn(
          `No certificate found for discente ${discente._id} in course ${courseId}`
        );
      }
    }

    res.status(200).json({ message: 'Certificato inviato con successo' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

const courseType = async (req, res) => {
  const { type } = req.body;

  try {
    const courseTypes = await CourseType.find({ type: type });
    if (courseTypes === type) {
      return res
        .status(400)
        .json({ message: 'Questo tipo di corso già esiste' });
    }

    // Create the course
    const newCourseType = new CourseType({ type: type });

    const createdCourseType = await newCourseType.save();

    res.status(201).json(createdCourseType);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error });
  }
};
const getCourseTypes = async (req, res) => {
  try {
    const courseTypes = await CourseType.find();
    if (courseTypes.length === 0) {
      return res.status(400).json({ message: 'Corso non trovato' });
    }
    res.status(201).json(courseTypes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
};
const deleteCourseTypes = async (req, res) => {
  const id = req.params.id;
  try {
    const courseTypes = await CourseType.find();
    if (courseTypes.length === 0) {
      return res.status(400).json({ message: 'Corso non trovato' });
    }
    const deletedCourseType = await CourseType.findByIdAndDelete(id);
    res.status(200).json(deletedCourseType);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
  }
};

const downloadCertificate = async (req, res) => {
  try {
    const { courseId, discenteId } = req.params;
    
    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    // Find the certificate for this discente
    const certificate = course.certificates?.find(cert => 
      cert.discenteId?.toString() === discenteId.toString()
    );

    if (!certificate) {
      return res.status(404).json({ 
        message: 'Certificato non trovato per questo discente' 
      });
    }

    // Build the file path
    const filePath = path.join(__dirname, '..', certificate.certificatePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: 'File del certificato non trovato sul server' 
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${discenteId}.pdf"`);
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ 
      message: 'Errore durante il download del certificato',
      error: error.message 
    });
  }
};

// Download all certificates as ZIP
const downloadAllCertificates = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find the course
    const course = await Course.findById(courseId).populate('discente');
    if (!course) {
      return res.status(404).json({ message: 'Corso non trovato' });
    }

    if (!course.certificates || course.certificates.length === 0) {
      return res.status(404).json({ message: 'Nessun certificato trovato per questo corso' });
    }

    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="certificati-corso-${course.progressiveNumber}.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ message: 'Errore durante la creazione del file ZIP' });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add each certificate to the archive
    for (const certificate of course.certificates) {
      const filePath = path.join(__dirname, '..', certificate.certificatePath);
      
      if (fs.existsSync(filePath)) {
        // Find the discente name for better filename
        const discente = course.discente.find(d => 
          d._id.toString() === certificate.discenteId.toString()
        );
        
        const fileName = discente 
          ? `${discente.nome}_${discente.cognome}_certificato.pdf`
          : `certificato_${certificate.discenteId}.pdf`;
        
        archive.file(filePath, { name: fileName });
      }
    }

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error('Error downloading all certificates:', error);
    res.status(500).json({ 
      message: 'Errore durante il download dei certificati',
      error: error.message 
    });
  }
};

module.exports = {
  createCourse,
  getCoursesByUser,
  getAllCourses,
  updateCourseStatus,
  assignDescente,
  getCourseById,
  removeDiscente,
  updateCourse,
  deleteCourse,
  getSingleCourseById,
  getCoursesByDiscenteId,
  addCourseQuantity,
  sendCertificateToDiscente,
  sendCertificate,
  uploadReportDocument,
  courseType,
  deleteCourseTypes,
  getCourseTypes,
  getAllDiscenteExpirationCourses,
  getDiscenteExpirations,
downloadAllCertificates,
downloadCertificate
};
