const mongoose = require('mongoose');

const giornataSchema = new mongoose.Schema({
  dataInizio: { type: Date, required: true },
  dataFine: { type: Date, required: true },
  oraInizio: { type: String, required: true },
  oraFine: { type: String, required: true },
});

const progressiveCounterSchema = new mongoose.Schema({
  counter: { type: Number, default: 0 },
});
const ProgressiveCounter = mongoose.model(
  'ProgressiveCounter',
  progressiveCounterSchema
);
// const generateProgressiveNumber = async (course) => {
//   const populatedCourse = await mongoose.model('Kit').findById(course?.tipologia).lean();
//   const creator = await mongoose.model('User').findById(course.userId).lean();
//   const creatorName = creator && creator?.role=='center' ? creator.name|| 'Unknown': creator.lastName || 'Unknown';
//   const courseType = populatedCourse?.type || 'Unknown';
//   const datePart = course.giornate[0]?.dataInizio.toISOString().split('T')[0];
//   let counterDoc = await ProgressiveCounter.findOne();
//   if (!counterDoc) {
//     counterDoc = new ProgressiveCounter({ counter: 1 });
//   } else {
//     counterDoc.counter += 1;
//   }
//   await counterDoc.save();
//   const counterStr = counterDoc.counter.toString().padStart(5, '0');
//   return `${creatorName}-${courseType}-${datePart}-${counterStr}`;
// };

const generateProgressiveNumber = async (course) => {
  const dateObj = course.giornate[0]?.dataInizio;
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const italianDateFormat = `${year}`;
  let counterDoc = await ProgressiveCounter.findOne();
  if (!counterDoc) {
    counterDoc = new ProgressiveCounter({ counter: 1 });
  } else {
    counterDoc.counter += 1;
  }
  await counterDoc.save();
  const counterStr = counterDoc.counter.toString().padStart(5, '0');
  return `${italianDateFormat}-${counterStr}`;
};

const courseSchema = new mongoose.Schema(
  {
    tipologia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kit',
      required: true,
    },
    città: { type: String, required: true },
    via: { type: String, required: true },
    presso: { type: String, required: true },
    provincia: { type: String, required: true },
    region: { type: String},
    zipcode: { type: String, required: true },
    numeroDiscenti: { type: Number, required: true },
    istruttore: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    direttoreCorso: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sanitario',
        required: true,
      },
    ],
    giornate: [giornataSchema],
    isRefreshCourse: { type: Boolean },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    discente: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discente' }],
    progressiveNumber: { type: String },
    status: {
      type: String,
      enum: ['active', 'unactive', 'update', 'end', 'complete', 'finalUpdate'],
      default: 'unactive',
    },
    reportDocument: { type: String, required: false },
    certificates: [
      {
        discenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discente' },
        certificatePath: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

courseSchema.pre('save', async function (next) {
  if (!this.progressiveNumber) {
    this.progressiveNumber = await generateProgressiveNumber(this);
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
