const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Kit = require('../models/Kit');
// const Product = require('../models/Product');

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
  const { productIds, quantities } = req.body;

  try {
    const productIdArray = Array.isArray(productIds) ? productIds : [productIds];
    const quantityArray = Array.isArray(quantities) ? quantities : [quantities];

    const products = await Kit.find({ _id: { $in: productIdArray } });

    if (products?.length === 0) {
      return res.status(404).json({ message: 'No products found for the provided IDs' });
    }

    // Calculate total amount
    const amount = products.reduce((total, product, index) => {
      const quantity = quantityArray[index] || 1; // Default to 1 if quantity is not specified
      const price = calculatePrice(product, quantity);
      return total + price * quantity;
    }, 0);

    // const products = await Kit.find({ _id: { $in: productIds } });

    // const amount = products.reduce((total, product, index) => {
    //   const quantity = quantities[index];
    //   const price = calculatePrice(product, quantity);
    //   return total + price * quantity;
    // }, 0);

    // console.log('amount: ', amount * 100);
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100) + 1000,
      currency: 'eur',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send('An error occurred, unable to create payment session');
  }
};

module.exports = { createPaymentSession };

// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Product = require('../models/Product'); // Assicurati di importare il modello Product

// const calculatePrice = (product, quantity) => {
//   if (quantity <= 10) {
//     return product.price1;
//   } else if (quantity <= 20) {
//     return product.price2;
//   } else {
//     return product.price3;
//   }
// };

// const createPaymentSession = async (req, res) => {
//   const { productIds, quantities } = req.body;

//   console.log("Received productIds:", productIds);
//   console.log("Received quantities:", quantities);
//   console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);

//   try {
//     // Recupera i prodotti dal database
//     const products = await Product.find({ _id: { $in: productIds } });
//     console.log("Products fetched from DB:", products);

//     const lineItems = products.map((product, index) => {
//       const quantity = quantities[index];
//       const price = calculatePrice(product, quantity); // Calcola il prezzo basato sulla quantità

//       return {
//         price_data: {
//           currency: 'eur',
//           product_data: {
//             name: product.title,
//             description: product.description,
//           },
//           unit_amount: Math.round(price * 100), // Stripe accetta gli importi in centesimi
//         },
//         quantity: quantity,
//       };
//     });

//     console.log("Line Items for Stripe session:", lineItems);

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: lineItems,
//       mode: 'payment',
//       success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.CLIENT_URL}/cancel`,
//     });

//     console.log("Stripe session created:", session);

//     res.json({ id: session.id });
//   } catch (error) {
//     console.error("Error creating Stripe session:", error);
//     res.status(500).send("An error occurred, unable to create payment session");
//   }
// };

// module.exports = { createPaymentSession };
