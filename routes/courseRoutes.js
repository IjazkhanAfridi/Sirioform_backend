const express = require('express');
const {
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
  getCourseTypes,
  deleteCourseTypes,
  getAllDiscenteExpirationCourses,
  getDiscenteExpirations,
  downloadCertificate, downloadAllCertificates 
} = require('../controllers/courseController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const uploadDocument = require('../middleware/uploadDocument');

const router = express.Router();

// Rotta per creare un nuovo corso
router.post('/', auth, createCourse);

// Rotta per ottenere i corsi dell'utente
router.get('/user-courses', auth, getCoursesByUser);

router.get('/user-courses/:id', auth, getCourseById);
router.get('/discente-courses/:id', auth, getCoursesByDiscenteId);
router.get('/user-course/:id', auth, getSingleCourseById);
router.get('/all-discente-expirations', auth, isAdmin, getAllDiscenteExpirationCourses);
router.get('/my-discente-expirations', auth, getDiscenteExpirations);

router.get('/', auth, isAdmin, getAllCourses);
router.post(
  '/courses/:courseId/upload-report',
  uploadDocument.single('reportDocument'),
  uploadReportDocument
);
router.patch('/courses/:courseId/status', auth, updateCourseStatus);

router.patch('/assign-discente', assignDescente);

router.patch('/remove-discente', removeDiscente);

router.patch('/courses/:courseId', auth, updateCourse);
router.patch('/courses/add-quatity/:courseId', auth, addCourseQuantity);

router.delete('/courses/:courseId', deleteCourse);

router.get(
  '/courses/:courseId/certificates/:discenteId',
  sendCertificateToDiscente
);
router.post('/courses/:courseId/send-email', sendCertificate);

router.post('/courses/course-type', auth, courseType);
router.delete('/courses/course-type/:id', auth, deleteCourseTypes);
router.get('/courses/course-type', getCourseTypes);

router.get('/courses/:courseId/certificate/:discenteId', auth, downloadCertificate);
router.get('/courses/:courseId/certificates/download-all', auth, downloadAllCertificates);

module.exports = router;
