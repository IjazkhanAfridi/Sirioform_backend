const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  registerCenter,
  getUnapprovedCenters,
  approveCenter,
  getAllCenters,
  getCenterById,
  assignSanitario,
  getAssignedSanitarios,
  removeSanitario,
  getCenterSanitarios,
  assignInstructor,
  removeInstructor,
  getAssignedInstructors,
  getCenterInstructors,
  updateCenter,
  deleteCenter,
  toggleCenterStatus,
} = require('../controllers/centerController');
const isAdmin = require('../middleware/isAdmin');

// Route per la registrazione di un nuovo centro
router.post('/register', registerCenter);
// update route
router.patch('/update/:centerId', auth, updateCenter);

// Route per ottenere i centri non approvati (richiede autenticazione)
router.get('/unapproved', auth, getUnapprovedCenters);

// Route per approvare un centro (richiede autenticazione)
router.put('/approve/:id', auth, approveCenter);

router.patch('/:centerId/toggle-status', auth, isAdmin, toggleCenterStatus);

// Route per ottenere tutti i centri attivi
router.get('/', getAllCenters);

// Route per ottenere un centro specifico per ID
router.get('/:id', getCenterById);

// Route per assegnare un sanitario a un centro (richiede autenticazione)
router.post('/assign-sanitario', assignSanitario);

// Route per ottenere i sanitari assegnati a un centro specifico
router.get('/:id/sanitarios', getAssignedSanitarios);

// Route per rimuovere un sanitario da un centro (richiede autenticazione)
router.post('/remove-sanitario', auth, removeSanitario);

// Route per ottenere i sanitari del centro loggato (richiede autenticazione)
router.get('/:centerId/sanitarios', auth, getCenterSanitarios);

// Route per assegnare un istruttore a un centro (richiede autenticazione)
router.post('/assign-instructor', assignInstructor);

// Route per rimuovere un istruttore da un centro (richiede autenticazione)
router.post('/remove-instructor', auth, removeInstructor);

// Route per ottenere gli istruttori assegnati a un centro specifico
router.get('/:id/instructors', getAssignedInstructors);

// Route per ottenere gli istruttori del centro loggato (richiede autenticazione)
router.get('/:centerId/instructors', auth, getCenterInstructors);

router.delete('/:centerId', auth, isAdmin,deleteCenter);


module.exports = router;
