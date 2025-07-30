const express = require('express');
const { getAllSirioform, registerSirioform, updateSirioform } = require("../controllers/sirioformController");
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();



router.patch('/update-sirioform', updateSirioform);
router.post('/register-sirioform', registerSirioform);
router.get('/', getAllSirioform);

module.exports = router;
