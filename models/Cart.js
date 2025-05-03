const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'items.itemType',
          required: true,
        },
        itemType: {
          type: String,
          default: 'Kit', 
          enum: ['Kit', 'PatentUpdate'],
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', CartSchema);







// const mongoose = require('mongoose');

// const cartSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   items: [
//     {
//       item: { type: mongoose.Schema.Types.ObjectId, ref: 'Kit' },
//       quantity: { type: Number, default: 6 },
//     },
//   ],
// });

// module.exports = mongoose.model('Cart', cartSchema);
