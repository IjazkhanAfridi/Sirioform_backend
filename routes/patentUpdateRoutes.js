const express = require('express');
const router = express.Router();
const { 
  createPatentUpdate, 
  getPatentUpdates, 
  getPatentUpdateById,
  updatePatentUpdate, 
  deletePatentUpdate 
} = require('../controllers/patentUpdateContoller');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.post('/create', auth, isAdmin, upload.fields([{ name: 'profileImage', maxCount: 1 }]), createPatentUpdate);
router.get('/', auth, getPatentUpdates);
router.get('/:id', auth, getPatentUpdateById);
router.patch('/:id', auth, isAdmin, upload.fields([{ name: 'profileImage', maxCount: 1 }]), updatePatentUpdate);
router.delete('/:id', auth, isAdmin, deletePatentUpdate);

module.exports = router;