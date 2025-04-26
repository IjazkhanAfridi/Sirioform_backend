const { default: mongoose } = require('mongoose');
const Cart = require('../models/Cart');
const Item = require('../models/Kit');

// Get all cart items
exports.getCartItems = async (req, res) => {
  console.log('req: ', req.user);
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.item');
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Add an item to the cart

exports.postCartItems = async (req, res) => {
  const { itemId, quantity } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }

    // Fetch the cart based on the current user's userId
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
    }

    const itemIndex = cart.items.findIndex((i) => i.item.toString() === itemId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity || 6;
    } else {
      const itemExists = await Item.findById(itemId);
      if (!itemExists) {
        return res.status(404).json({ message: 'Oggetto non trovato' });
      }
      cart.items.push({ item: itemId, quantity: quantity || 6 });
    }

    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


// Delete an item from the cart
exports.deleteCartItmes = async (req, res) => {
  const { itemId } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Carrello non trovato' });
    }
    const itemObjectId = new mongoose.Types.ObjectId(itemId);
    cart.items = cart.items.filter(
      (i) => !i.item.equals(itemObjectId) && !i._id.equals(itemObjectId)
    );
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
