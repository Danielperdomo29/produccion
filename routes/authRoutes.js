const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    successRedirect: process.env.FRONTEND_URL || 'http://localhost:5500'
  })
);

router.get('/logout', authController.logout);
router.get('/current', authController.getCurrentUser);

module.exports = router;