const express = require('express');
const {
  createDiscente,
  getAllDiscenti,
  getUserDiscenti,
  getUserDiscentiById,
  updateDiscentePatentNumber,
  associateDiscenteWithUser,
  searchDiscente,
  getDiscenteKitAssignments,
  removeKitAssignment,
  getCourseKitAssignments,
  migratePatentNumbersToKitAssignments,
  canAssignKitToDiscente,
} = require('../controllers/discenteController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();

// create Discente api
router.post('/', auth, createDiscente);

// Rotta GET per ottenere tutti i discenti
router.get('/', auth, getUserDiscenti);
router.get('/all', auth, isAdmin, getAllDiscenti);
router.get('/:id', auth, getUserDiscentiById);
router.patch('/:id', auth, updateDiscentePatentNumber);
router.get('/search/term', auth, searchDiscente);
router.post('/associate', auth, associateDiscenteWithUser);

// New kit assignment routes
router.get(
  '/:discenteId/kit-assignments/:courseId?',
  auth,
  getDiscenteKitAssignments
);
router.delete(
  '/:discenteId/kit-assignments/:assignmentId',
  auth,
  removeKitAssignment
);
router.get('/course/:courseId/kit-assignments', auth, getCourseKitAssignments);
router.post(
  '/migrate-kit-assignments',
  auth,
  isAdmin,
  migratePatentNumbersToKitAssignments
);
router.get(
  '/:discenteId/can-assign-kit/:courseId',
  auth,
  canAssignKitToDiscente
);

module.exports = router;
