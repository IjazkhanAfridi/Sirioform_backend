const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createDocument,
  getDocuments,
  deleteDocument,
  updateDocument,
} = require('../controllers/documentController');
const isAdmin = require('../middleware/isAdmin');
const auth = require('../middleware/auth');

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only PDF, DOC, and DOCX files are allowed!'));
    }
  }
});


router.post(
  '/',
  auth,
  isAdmin,
  upload.fields([{ name: 'doc', maxCount: 1 }]),
  createDocument
);
router.get('/', auth, getDocuments);
router.patch(
  '/:id',
  auth,
  isAdmin,
  upload.fields([{ name: 'doc', maxCount: 1 }]),
  updateDocument
);
router.delete('/:id', auth, isAdmin, deleteDocument);

module.exports = router;
