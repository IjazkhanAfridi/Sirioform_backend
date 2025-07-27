const mongoose = require('mongoose');

// Kit Assignment Schema for associating kit numbers with courses
const kitAssignmentSchema = new mongoose.Schema(
  {
    kitNumber: { type: String, required: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    courseName: { type: String },
    courseType: { type: String },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    instructorName: { type: String },
    centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    centerName: { type: String },
    assignedDate: { type: Date, default: Date.now },
    kitType: { type: String }, // Type of kit (e.g., "Basic", "Advanced", etc.)
  },
  { _id: true }
);

const discenteSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    cognome: { type: String, required: true },
    codiceFiscale: { type: String, required: true },
    indirizzo: { type: String },
    città: { type: String },
    regione: { type: String, required: true },
    email: { type: String, required: true },
    telefono: { type: String, required: true },
    patentNumber: { type: [String], default: [] }, // Keep for backward compatibility
    kitAssignments: [kitAssignmentSchema], // New structured kit assignments
    dateOfBirth: { type: Date, required: true },
    placeOfBirth: { type: String, required: true },
    province: { type: String, required: true },
    residenceIn: { type: String, required: true },
    street: { type: String, required: true },
    number: { type: String, required: true },
    zipCode: { type: String, required: true },
    gender: { type: String, required: true },
    companyAffiliation: { type: String, default: '' },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

discenteSchema.index({ codiceFiscale: 1, userId: 1 }, { unique: true });
discenteSchema.index({ email: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Discente', discenteSchema);
