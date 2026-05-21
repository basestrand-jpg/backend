const router = require('express').Router();

/* =========================================
   PAYFAST TEMPORARILY DISABLED
========================================= */

router.post('/checkout', async (req, res) => {

  return res.status(503).json({
    success: false,
    message:
      'Subscriptions are temporarily disabled.'
  });

});

router.post('/payfast-itn', async (req, res) => {

  return res.status(200).send(
    'PayFast disabled'
  );

});

module.exports = router;