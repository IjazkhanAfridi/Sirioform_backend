const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Kit = require('../models/Kit');
const PatentUpdate = require('../models/PatentUpdate');

const calculatePrice = (product, quantity) => {
  if (quantity <= 10) {
    return product.cost1;
  } else if (quantity <= 20) {
    return product.cost2;
  } else {
    return product.cost3;
  }
};

const createPaymentSession = async (req, res) => {
  const { productIds, quantities, productType } = req.body;
  console.log('productType: ', productType);
  try {
    const productIdArray = Array.isArray(productIds) ? productIds : [productIds];
    const quantityArray = Array.isArray(quantities) ? quantities : [quantities];
    
    let products = [];
    if (productType === 'patent') {
      products = await PatentUpdate.find({ _id: { $in: productIdArray } });
    } else {
      products = await Kit.find({ _id: { $in: productIdArray } });
    }

    if (products?.length === 0) {
      return res.status(404).json({ message: 'No products found for the provided IDs' });
    }
    
    const amount = products.reduce((total, product, index) => {
      const quantity = quantityArray[index] || 1; 
      const price = calculatePrice(product, quantity);
      return total + price * quantity;
    }, 0);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100) + 1000,
      currency: 'eur',
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment session error:", error);
    res.status(500).send('An error occurred, unable to create payment session');
  }
};

module.exports = { createPaymentSession };



// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Kit = require('../models/Kit');

// const calculatePrice = (product, quantity) => {
//   if (quantity <= 10) {
//     return product.cost1;
//   } else if (quantity <= 20) {
//     return product.cost2;
//   } else {
//     return product.cost3;
//   }
// };

// const createPaymentSession = async (req, res) => {
//   const { productIds, quantities } = req.body;
//   try {
//     const productIdArray = Array.isArray(productIds) ? productIds : [productIds];
//     const quantityArray = Array.isArray(quantities) ? quantities : [quantities];
//     const products = await Kit.find({ _id: { $in: productIdArray } });

//     if (products?.length === 0) {
//       return res.status(404).json({ message: 'No products found for the provided IDs' });
//     }
//     const amount = products.reduce((total, product, index) => {
//       const quantity = quantityArray[index] || 1; 
//       const price = calculatePrice(product, quantity);
//       return total + price * quantity;
//     }, 0);
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(amount * 100) + 1000,
//       currency: 'eur',
//       payment_method_types: ['card'],
//     });
//     res.json({ clientSecret: paymentIntent.client_secret });
//   } catch (error) {
//     res.status(500).send('An error occurred, unable to create payment session');
//   }
// };

// module.exports = { createPaymentSession };