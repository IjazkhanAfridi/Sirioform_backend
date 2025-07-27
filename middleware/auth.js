const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // console.log('Inizio middleware auth');
  const token = req.header('x-auth-token');
  // console.log('Token ricevuto:', token);

  if (!token) {
    console.log('Nessun token fornito');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // console.log('Verifica del token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Token decodificato:', JSON.stringify(decoded, null, 2));
    req.user = decoded.user;
    // console.log('User impostato in req:', JSON.stringify(req.user, null, 2));
    next();
  } catch (err) {
    console.error('Errore nella verifica del token:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
