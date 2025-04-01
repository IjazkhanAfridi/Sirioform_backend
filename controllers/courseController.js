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
const CourseType = require('../models/CourseType');

// Funzione per creare un nuovo corso
const createCourse = async (req, res) => {
  const {
    tipologia,
    città,
    via,
    presso,
    provincia,
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
      return res.status(400).json({ message: 'No kits found for the user' });
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
      return res
        .status(400)
        .json({ message: 'Not enough kits available to create the course' });
    }

    // Create the course
    const newCourse = new Course({
      tipologia,
      città,
      via,
      presso,
      provincia,
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
      } has created a new ${
        isRefreshCourse == true ? ' Refresh ' : ''
      } course.`,
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
    console.error('Errore durante la creazione del corso:', error);
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

const getCoursesByDiscenteId = async (req, res) => {
  try {
    const discenteId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(discenteId)) {
      return res.status(400).json({ message: 'Invalid discenteId format' });
    }

    // Check if the user is an admin
    const query = req.user.role === 'admin' 
      ? { discente: discenteId } // Admin can see all courses for the discente
      : { userId: req.user.id, discente: discenteId }; // Regular users see only their courses

    const courses = await Course.find(query)
      .populate('tipologia')
      .populate('discente');

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
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find all orders that contain the related kits for this course's tipologia
    const orders = await Order.find({
      userId: course.userId,
      'orderItems.productId': course.tipologia,
    });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: 'Orders not found for this course' });
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
    console.error('Error retrieving course:', error);
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
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.reportDocument = file.path;
    await course.save();

    res
      .status(200)
      .json({ message: 'Report document uploaded successfully', course });
  } catch (error) {
    console.error('Error uploading report document:', error);
    res.status(500).json({ message: 'Error uploading report document' });
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
      return res.status(404).json({ message: 'Course not found' });
    }
    console.log('course: ', course);

    if (status === 'end') {
      if (!course.reportDocument) {
        return res.status(400).json({
          message: 'Report document is required before ending the course',
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

      console.log('allProgressiveNumbers: ', allProgressiveNumbers);

      // Check if every student has at least one patent number in the aggregated list
      const allDiscentesHaveMatch = course.discente.every((discente) =>
        discente.patentNumber.some((patentNum) =>
          allProgressiveNumbers.includes(patentNum)
        )
      );

      if (!allDiscentesHaveMatch) {
        return res.status(400).json({
          message: `Each student must have a patent number with type ${course.tipologia.type} before ending the course.`,
        });
      }
    }

    if (status === 'complete') {
      const certificates = [];
      for (const discente of course.discente) {
        const filePath = await generateCertificate(discente, course);
        console.log('filePath: ', filePath);
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
                ? `Admin wants to update ${course?.tipologia?.type} course.`
                : `The status of your course ${course?.tipologia?.type} has changed.`
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
              } wants to end the ${course?.tipologia?.type} course.`
            }`,
            senderId: req.user.id,
            category: 'general',
            isAdmin: true,
          }
    );

    res.status(200).json(course);
  } catch (error) {
    console.error('Error updating course status:', error);
    res.status(500).json({ message: 'Error updating course status' });
  }
};

const assignDescente = async (req, res) => {
  try {
    const { courseId, discenteId } = req.body;
    if (!courseId || !discenteId) {
      return res
        .status(400)
        .json({ error: 'Course ID and Discente ID are required' });
    }
    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(discenteId)
    ) {
      return res.status(400).json({ error: 'Invalid courseId or discenteId' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.discente.includes(discenteId)) {
      return res
        .status(400)
        .json({ error: 'Discente is already assigned to this course' });
    }
    if (course.discente.length >= Number(course.numeroDiscenti)) {
      return res.status(400).json({
        error: `You already assigned ${course.numeroDiscenti} discente`,
      });
    }
    course.discente.push(discenteId);
    await course.save();
    res.status(200).json({ message: 'Discente successfully assigned', course });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const removeDiscente = async (req, res) => {
  const { courseId, discenteId } = req.body;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'course not found' });
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
      return res.status(404).json({ message: 'Course not found' });
    }

    const userOrders = await Order.find({
      userId: course.userId,
      'orderItems.productId': course.tipologia,
    });

    if (!userOrders.length) {
      return res.status(400).json({ message: 'No orders found for this user' });
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
        .json({ message: 'Course not found after deletion' });
    }

    res.status(200).json({
      message: 'Course successfully deleted and kits returned to the user',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Error deleting course' });
  }
};

const updateCourse = async (req, res) => {
  const { courseId } = req.params;
  const {
    città,
    via,
    presso,
    provincia,
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
      return res.status(404).json({ message: 'Course not found' });
    }

    // Fetch the user's orders for the kit used in this course
    const userOrders = await Order.find({
      userId: req.user.id,
      'orderItems.productId': course?.tipologia,
    }).populate('userId');

    console.log('userOrders: ', userOrders);
    console.log('userOrders[0]?.userId?.name : ', userOrders[0]?.userId?.name);

    if (!userOrders.length) {
      return res.status(400).json({ message: 'No kits found for the user' });
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
        return res
          .status(400)
          .json({ message: 'Not enough kits available to update the course' });
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
      } has updated the  course.`,
      senderId: req.user.id,
      category: 'general',
      isAdmin: true,
    });
    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course' });
  }
};

const addCourseQuantity = async (req, res) => {
  const { courseId } = req.params;
  const { numeroDiscenti } = req.body;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Fetch the user's orders for the kit used in this course
    const userOrders = await Order.find({
      userId: req.user.id,
      'orderItems.productId': course?.tipologia,
    }).populate('userId');

    if (!userOrders.length) {
      return res.status(400).json({ message: 'No kits found for the user' });
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
    console.log('totalAvailableQuantity: ', totalAvailableQuantity);

    // Calculate the current kits used in the course
    const currentUsedKits = course.numeroDiscenti;
    console.log('currentUsedKits: ', currentUsedKits);

    // Calculate the difference to check if quantity can be increased
    const difference = numeroDiscenti;
    console.log('difference: ', difference);
    if (difference <= 0) {
      return res
        .status(400)
        .json({ message: 'Only additional quantity can be added' });
    }

    // Ensure the additional quantity does not exceed available kits
    if (difference > totalAvailableQuantity) {
      return res
        .status(400)
        .json({ message: 'Not enough kits available to increase quantity' });
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
      } has added quantity to the course.`,
      senderId: req.user.id,
      category: 'general',
      isAdmin: true,
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Error updating course quantity:', error);
    res.status(500).json({ message: 'Error updating course quantity' });
  }
};

const sendCertificateToDiscente = async (req, res) => {
  const { courseId, discenteId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const certificate = course.certificates.find(
      (cert) => cert.discenteId.toString() === discenteId
    );
    if (!certificate) {
      return res
        .status(404)
        .json({ message: 'Certificate not found for this discente' });
    }

    const filePath = path.join(__dirname, '..', certificate.certificatePath);

    // Send the certificate file to the user
    res.download(filePath, `${discenteId}-certificate.pdf`);
  } catch (error) {
    console.error('Error sending certificate:', error);
    res.status(500).json({ message: 'Error sending certificate' });
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
      return res.status(404).json({ message: 'Course not found' });
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
      return res.status(400).json({ message: 'No valid recipients found' });
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
          subject: 'Certificate of completion',
          text: `${message}\n\nDownload your certificate here: ${certificateLink}`,
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

    res.status(200).json({ message: 'Certificates sent successfully' });
  } catch (error) {
    console.error('Error sending certificates:', error);
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
        .json({ message: 'this course type already exist' });
    }

    // Create the course
    const newCourseType = new CourseType({ type: type });

    const createdCourseType = await newCourseType.save();

    res.status(201).json(createdCourseType);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error', error: error });
  }
};
const getCourseTypes = async (req, res) => {
  try {
    const courseTypes = await CourseType.find();
    if (courseTypes.length === 0) {
      return res.status(400).json({ message: 'No Course Found' });
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
      return res.status(400).json({ message: 'No Course Found' });
    }
    const deletedCourseType = await CourseType.findByIdAndDelete(id);
    res.status(200).json(deletedCourseType);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error' });
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
};
