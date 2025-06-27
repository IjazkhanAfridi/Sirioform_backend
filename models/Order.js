const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a counter schema for order numbers
const orderCounterSchema = new Schema({
  _id: { type: String, default: 'orderNumber' },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', orderCounterSchema);

const getItalianTime = () => {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' })
  );
};

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [
    {
      productId: { type: Schema.Types.ObjectId, ref: 'Kit', required: true },
      totalQuantity: { type: Number, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      progressiveNumbers: { type: [String], required: true },
    },
  ],
  totalPrice: { type: Number, required: true },
  // createdAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: getItalianTime },
  orderNumber: { type: String, unique: true },
  isShipped: { type: Boolean, default: false },
  note: { type: String, default: '' }, // New note field
});

// Pre-save hook for generating order number (as previously added)
orderSchema.pre('save', async function (next) {
  const doc = this;
  if (!doc.orderNumber) {
    // Only increment if orderNumber doesn't exist
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'orderNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.orderNumber = counter.seq.toString().padStart(6, '0');
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

orderSchema.methods.getOrderDetails = function () {
  return {
    userId: this.userId,
    orderItems: this.orderItems,
    totalPrice: this.totalPrice,
    createdAt: this.createdAt,
    orderNumber: this.orderNumber,
    isShipped: this.isShipped,
    note: this.note,
  };
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const orderSchema = new Schema({
//   userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   orderItems: [
//     {
//       productId: { type: Schema.Types.ObjectId, ref: 'Kit', required: true },
//       totalQuantity: { type: Number, required: true },
//       quantity: { type: Number, required: true },
//       price: { type: Number, required: true },
//       progressiveNumbers: { type: [String], required: true },
//     },
//   ],
//   totalPrice: { type: Number, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// orderSchema.methods.getOrderDetails = function () {
//   console.log('Getting order details for order ID:', this._id);
//   return {
//     userId: this.userId,
//     orderItems: this.orderItems,
//     totalPrice: this.totalPrice,
//     createdAt: this.createdAt,
//   };
// };

// const Order = mongoose.model('Order', orderSchema);

// module.exports = Order;
