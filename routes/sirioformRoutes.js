const express = require('express');
const { getAllSirioform, registerSirioform, updateSirioform } = require("../controllers/sirioformController");
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();



router.patch('/update-trainer', updateSirioform);
router.post('/register-trainer', registerSirioform);
router.get('/', getAllSirioform);

module.exports = router;
