const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QualificationSchema = new Schema({
  name: { type: String, required: true },
  expirationDate: { type: Date, required: true },
});

// Instructor Course Completion Schema for tracking course completions and expiry
const instructorCourseCompletionSchema = new Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    courseName: { type: String },
    courseType: { type: String },
    kitType: { type: String }, // Type of kit used in the course
    centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    centerName: { type: String },
    completedDate: { type: Date }, // Date when the course was completed
    expirationDate: { type: Date }, // Date when the course expires (1 year from completion for instructors)
  },
  { _id: true }
);

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'center', 'instructor', 'sirioform', 'trainer'],
  },
  // Fields for all users
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  region: { type: String },
  provincia: { type: String },
  cap: { type: String },
  // Fields for Center and Instructor roles
  name: { type: String },
  piva: { type: String },
  isActive: { type: Boolean, default: false },
  // Fields specific to Instructor
  firstName: { type: String },
  lastName: { type: String },
  lastName: { type: String },
  resumeUrl: { type: String },
  fiscalCode: {
    type: String,
    unique: function () {
      return this.role === 'instructor';
    },
  },
  brevetNumber: { type: String },
  qualifications: [QualificationSchema],
  courseCompletions: [instructorCourseCompletionSchema], // Track instructor course completions
  sanitarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sanitario' }],
  instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('User', UserSchema);
