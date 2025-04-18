const Cart = require('../models/Cart');
const Course = require('../models/Course');
const Kit = require('../models/Kit');
const Order = require('../models/Order');

const extractProgressiveNumber = (progressiveNumber) => {
  const parts = progressiveNumber.split('-');
  return parseInt(parts[1], 10);
};

const createOrderController = async (req, res) => {
  const { productIds, quantities,fromCart } = req.body;
  console.log('fromCart: ', fromCart);

  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: 'User information is missing.' });
    }

    for (let quantity of quantities) {
      if (quantity < 6 || quantity % 6 !== 0) {
        return res
          .status(400)
          .json({
            message: 'Quantity must be a multiple of 6 and at least 6.',
          });
      }
    }

    const orders = await Order.find();
    let maxProgressiveNumber = 0;

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        item.progressiveNumbers.forEach((pn) => {
          const num = extractProgressiveNumber(pn);
          if (num > maxProgressiveNumber) {
            maxProgressiveNumber = num;
          }
        });
      });
    });
    const orderItems = [];
    let totalPrice = 0;
    const currentYear = new Date().getFullYear().toString().slice(-2);

    for (let i = 0; i < productIds.length; i++) {
      const product = await Kit.findById(productIds[i]);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product with id ${productIds[i]} not found` });
      }

      let price;
      if (quantities[i] <= 10) {
        price = product.cost1;
      } else if (quantities[i] <= 20) {
        price = product.cost2;
      } else {
        price = product.cost3;
      }

      const progressiveNumbers = [];
      for (let j = 0; j < quantities[i]; j++) {
        maxProgressiveNumber++;
        progressiveNumbers.push(
          `${currentYear}-${String(maxProgressiveNumber).padStart(7, '0')}`
        );
      }

      orderItems.push({
        productId: productIds[i],
        quantity: quantities[i],
        totalQuantity: quantities[i],
        price: price,
        progressiveNumbers: progressiveNumbers,
      });
      totalPrice += price * quantities[i];
    }
    
    const newOrder = new Order({
      userId: req.user.id,
      orderItems: orderItems,
      totalPrice: totalPrice,
    });
    
    const savedOrder = await newOrder.save();
    if (fromCart) {
      const userCart = await Cart.findOne({ userId: req.user.id }).populate('items');
      if (userCart) {
        userCart.items = userCart?.items?.filter(
          (cartItem) => !productIds?.includes(cartItem?.item?.toString())
        );
        await userCart.save();
        console.log('Cart updated: Items removed after order creation.');
      }
    }

    res.status(201).json(savedOrder);
  } catch (err) {
    console.log('err: ', err);
    res
      .status(500)
      .json({ message: 'Server error, order could not be created' });
  }
};

// Funzione per creare un nuovo ordine
const createOrder = async (req, res) => {
  const { userId, orderItems } = req.body;

  console.log('Order data received:', { userId, orderItems }); // Log dei dati ricevuti

  const order = new Order({
    user: userId,
    orderItems,
    orderDate: Date.now(),
  });

  try {
    const createdOrder = await order.save();
    console.log('Order created and saved:', createdOrder); // Log per confermare la creazione
    res.status(201).json(createdOrder);
  } catch (err) {
    console.error('Error during order creation:', err); // Log per errori
    res.status(500).json({ error: 'Order creation failed' });
  }
};

// Funzione per visualizzare tutti gli ordini (solo per admin)
const getAllOrders = async (req, res) => {
  console.log('--- Entering getAllOrders ---');
  console.log('req.user:', req.user);

  try {
    if (req.user?.role == 'admin') {
      console.log('User is admin, fetching all orders...');
      const orders = await Order.find()
        .populate(
          'userId orderItems.productId',
          'firstName lastName role name type code isRefreshCourse isForInstructor isForTrainer'
        )
        .populate('orderItems');
      console.log('Orders fetched with populate:', orders);
      res.json(orders);
    } else {
      console.log(
        'User is not admin, fetching orders for userId:',
        req.user._id
      );
      const orders = await Order.find({ userId: req.user._id });
      console.log('User-specific orders fetched:', orders);
      res.json(orders);
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
  console.log('--- Exiting getAllOrders ---');
};

const getUserOrders = async (req, res) => {
  console.log('GET /api/orders - Fetching user orders'); // Log
  try {
    const orders = await Order.find({ userId: req.user.id }).populate(
      'orderItems.productId',
      'type'
    );
    console.log('User orders fetched:', orders);
    res.json(orders);
  } catch (err) {
    console.error('Fetching orders error:', err);
    res
      .status(500)
      .json({ message: 'Server error, could not retrieve orders' });
  }
};

const getProdottiAcquistati = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).populate(
      'orderItems.productId'
    );
    const courses = await Course.find({ userId: req.user.id }).populate('discente');

    const prodottiAcquistati = orders.reduce((acc, order) => {
      order.orderItems.forEach((item) => {
        const prodotto = acc.find((prod) =>
          prod._id.equals(item.productId._id)
        );
        if (prodotto) {
          prodotto.quantity += item.quantity;
          prodotto.totalQuantity += item.totalQuantity;
          prodotto.progressiveNumbers = prodotto.progressiveNumbers.concat(
            item.progressiveNumbers
          );
        } else {
          acc.push({
            _id: item.productId._id,
            title: item.productId.type,
            quantity: item.quantity,
            isRefreshKit: item.productId.isRefreshKit,
            isForInstructor: item.productId.isForInstructor,
            isForTrainer: item.productId.isForTrainer,
            totalQuantity: item.totalQuantity || 0,
            progressiveNumbers: item.progressiveNumbers || [],
            assignedQuantity: 0,
            usedQuantity: 0,
          });
        }
      });
      return acc;
    }, []);

    // Calculate assigned and used quantities
    prodottiAcquistati?.forEach((prodotto) => {
      courses?.forEach((course) => {
        course.discente.forEach((discente) => {
          discente.patentNumber.forEach((patentNumber) => {
            if (prodotto.progressiveNumbers.includes(patentNumber)) {
              prodotto.usedQuantity += 1;
            }
          });
        });
        course?.orderItems?.forEach((item) => {
          if (item.productId.equals(prodotto._id)) {
            prodotto.assignedQuantity += item.quantity;
          }
        });
      });
    });

    res.status(200).json(prodottiAcquistati);
  } catch (err) {
    console.log('err: ', err);
    res
      .status(500)
      .json({ message: 'Errore durante il recupero dei prodotti acquistati' });
  }
};

// const getProdottiAcquistati = async (req, res) => {
//   try {
//     const orders = await Order.find({ userId: req.user.id }).populate(
//       'orderItems.productId'
//     );
//     const prodottiAcquistati = orders.reduce((acc, order) => {
//       order.orderItems.forEach((item) => {
//         console.log('order.orderItems: ', order.orderItems);
//         const prodotto = acc.find((prod) =>
//           prod._id.equals(item.productId._id)
//         );
//         if (prodotto) {
//           prodotto.quantity += item.quantity;
//           prodotto.totalQuantity += item.totalQuantity;
//           prodotto.isRefreshKit;
//           prodotto.isForInstructor;
//           prodotto.isForTrainer;
//           prodotto.progressiveNumbers = prodotto.progressiveNumbers.concat(
//             item.progressiveNumbers
//           );
//         } else {
//           acc.push({
//             _id: item.productId._id,
//             title: item.productId.type,
//             quantity: item.quantity,
//             isRefreshKit: item.productId.isRefreshKit,
//             isForInstructor: item.productId.isForInstructor,
//             isForTrainer: item.productId.isForTrainer,
//             totalQuantity: item.totalQuantity || 0,
//             progressiveNumbers: item.progressiveNumbers || [],
//           });
//         }
//       });
//       return acc;
//     }, []);
//     res.status(200).json(prodottiAcquistati);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: 'Errore durante il recupero dei prodotti acquistati' });
//   }
// };

module.exports = {
  createOrder,
  getAllOrders,
  getProdottiAcquistati,
  createOrderController,
  getUserOrders,
}; // Aggiungi la nuova funzione
