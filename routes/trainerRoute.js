const express = require('express');
const { getAllTrainer } = require("../controllers/trainerController");
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();



router.get('/', getAllTrainer);

module.exports = router;
