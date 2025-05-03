const Course = require('../models/Course');
const Sanitario = require('../models/Sanitario');
const User = require('../models/User');

exports.createSanitario = async (req, res) => {
  const {
    title,
    firstName,
    lastName,
    fiscalCode,
    address,
    city,
    region,
    email,
    phone,
  } = req.body;

  try {
    const newSanitario = new Sanitario({
      title: title || '',
      firstName,
      lastName,
      fiscalCode,
      address,
      city,
      region,
      email,
      phone,
    });

    await newSanitario.save();
    res.status(201).json(newSanitario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSanitarios = async (req, res) => {
  try {
    // Get all sanitarios
    const sanitarios = await Sanitario.find();

    // Enhanced response with associations
    const enhancedSanitarios = await Promise.all(
      sanitarios.map(async (sanitario) => {
        // Find centers that have this sanitario
        const associatedCenters = await User.find({
          role: 'center',
          sanitarios: sanitario._id, // Assuming centers have a sanitarios array
        }).select('name email _id');

        // Find instructors that have this sanitario
        const associatedInstructors = await User.find({
          role: 'instructor',
          sanitarios: sanitario._id, // Assuming instructors have a sanitarios array
        }).select('firstName lastName email _id');

        // Include courses if they have sanitarios
        const associatedCourses = await Course.find({
          direttoreCorso: sanitario._id,
        })
        .select('tipologia')
        .populate('tipologia', 'type code');

        // Return sanitario with its associations
        return {
          ...sanitario.toObject(),
          associations: {
            centers: associatedCenters,
            instructors: associatedInstructors,
            courses: associatedCourses.map((course) => ({
              _id: course._id,
              code:course.tipologia.code,
              type:course.tipologia.type,
            })),
          },
        };
      })
    );
    
    res.json(enhancedSanitarios);
  } catch (err) {
    console.error('Error retrieving sanitarios with associations:', err);
    res.status(500).json({ error: err.message });
  }
};

// exports.getAllSanitarios = async (req, res) => {
//   try {
//     const sanitarios = await Sanitario.find();
//     res.json(sanitarios);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.updateSanitario = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedSanitario = await Sanitario.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedSanitario) {
      return res.status(404).json({ error: 'Sanitario non trovato' });
    }

    res.json(updatedSanitario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSanitario = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSanitario = await Sanitario.findByIdAndDelete(id);

    if (!deletedSanitario) {
      return res.status(404).json({ error: 'Sanitario non trovato' });
    }

    res.json({ message: 'Sanitario eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
