const express = require('express');
const { createDiscente, getAllDiscenti,getUserDiscenti, getUserDiscentiById } = require('../controllers/discenteController'); 
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin')
const router = express.Router();

// create Discente api
router.post('/', auth, createDiscente);

// Rotta GET per ottenere tutti i discenti
router.get('/', auth, getUserDiscenti);  
router.get('/all', auth,isAdmin, getAllDiscenti);  
router.get('/:id', auth, getUserDiscentiById);  

module.exports = router;
