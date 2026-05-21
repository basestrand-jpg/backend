const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { User, CompanyKey } = require('../models/User');

/* =========================================
   EMAIL TRANSPORT
========================================= */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================================
   HELPERS
========================================= */

const generateToken = (user) => {

  return jwt.sign(
    {
      id: user._id,
      companyGroup: user.companyGroup,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

};

const sanitizeUser = (user) => {

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    companyGroup: user.companyGroup,
    role: user.role
  };

};

/* =========================================
   FORGOT PASSWORD
========================================= */

router.post('/forgot-password', async (req, res) => {

  try {

    const email =
      req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({
        message: 'Email Required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {

      return res.json({
        message:
          'If the account exists, a reset email was sent.'
      });

    }

    const token =
      crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;

    user.resetPasswordExpires =
      Date.now() + 3600000;

    await user.save();

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const resetLink =
      `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'NovaCRM Password Reset',
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>NovaCRM Password Reset</h2>

          <p>
            Click below to reset your password.
          </p>

          <a
            href="${resetLink}"
            style="
              background:#2563eb;
              color:white;
              padding:12px 20px;
              text-decoration:none;
              border-radius:8px;
              display:inline-block;
            "
          >
            Reset Password
          </a>

          <p style="margin-top:20px;font-size:12px;color:gray;">
            This link expires in 1 hour.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message:
        'If the account exists, a reset email was sent.'
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: 'Server Error'
    });

  }

});

/* =========================================
   LOGIN
========================================= */

router.post('/login', async (req, res) => {

  try {

    const email =
      req.body.email?.toLowerCase().trim();

    const password =
      req.body.password;

    if (!email || !password) {

      return res.status(400).json({
        message: 'Email and Password Required'
      });

    }

    const user = await User.findOne({ email });

    if (!user) {

      return res.status(400).json({
        message: 'Invalid Credentials'
      });

    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {

      return res.status(400).json({
        message: 'Invalid Credentials'
      });

    }

    const token = generateToken(user);

    res.json({
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: 'Server Error'
    });

  }

});

/* =========================================
   REGISTER
========================================= */

router.post('/register', async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      companyGroup,
      secretPhrase
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({
        message: 'Missing Required Fields'
      });

    }

    if (password.length < 6) {

      return res.status(400).json({
        message:
          'Password must be at least 6 characters'
      });

    }

    const cleanEmail =
      email.toLowerCase().trim();

    const existingUser =
      await User.findOne({
        email: cleanEmail
      });

    if (existingUser) {

      return res.status(400).json({
        message:
          'Email already registered'
      });

    }

    const hashedUserPassword =
      await bcrypt.hash(password, 10);

    const cleanCompanyKey =
      companyGroup
        ? companyGroup.toLowerCase().trim()
        : 'individual';

    let assignedRole = 'Admin';

    if (cleanCompanyKey !== 'individual') {

      if (!secretPhrase) {

        return res.status(400).json({
          message:
            'Company Passphrase Required'
        });

      }

      const companyRecord =
        await CompanyKey.findOne({
          name: cleanCompanyKey
        });

      if (companyRecord) {

        const isPhraseValid =
          await bcrypt.compare(
            secretPhrase,
            companyRecord.secretPhraseHash
          );

        if (!isPhraseValid) {

          return res.status(400).json({
            message:
              'Invalid Company Passphrase'
          });

        }

        assignedRole = 'Standard Agent';

      } else {

        const hashedCompanyPhrase =
          await bcrypt.hash(secretPhrase, 10);

        await CompanyKey.create({
          name: cleanCompanyKey,
          secretPhraseHash:
            hashedCompanyPhrase
        });

      }

    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedUserPassword,
      companyGroup: cleanCompanyKey,
      role: assignedRole
    });

    const token = generateToken(user);

    res.json({
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: 'Server Error'
    });

  }

});

/* =========================================
   CHANGE PASSWORD
========================================= */

router.put('/change-password', async (req, res) => {

  try {

    const {
      email,
      currentPassword,
      newPassword
    } = req.body;

    if (
      !email ||
      !currentPassword ||
      !newPassword
    ) {

      return res.status(400).json({
        message:
          'Missing Required Fields'
      });

    }

    if (newPassword.length < 6) {

      return res.status(400).json({
        message:
          'Password must be at least 6 characters'
      });

    }

    const user =
      await User.findOne({
        email: email.toLowerCase().trim()
      });

    if (!user) {

      return res.status(404).json({
        message: 'User Not Found'
      });

    }

    const valid =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!valid) {

      return res.status(400).json({
        message:
          'Current Password Incorrect'
      });

    }

    user.password =
      await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({
      message:
        'Password Updated Successfully'
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: 'Server Error'
    });

  }

});

/* =========================================
   RESET PASSWORD CONFIRM
========================================= */

router.post(
  '/reset-password-confirm',
  async (req, res) => {

    try {

      const {
        token,
        newPassword
      } = req.body;

      if (
        !token ||
        !newPassword
      ) {

        return res.status(400).json({
          message:
            'Missing Required Fields'
        });

      }

      if (newPassword.length < 6) {

        return res.status(400).json({
          message:
            'Password must be at least 6 characters'
        });

      }

      const user =
        await User.findOne({
          resetPasswordToken: token,
          resetPasswordExpires: {
            $gt: Date.now()
          }
        });

      if (!user) {

        return res.status(400).json({
          message:
            'Invalid or Expired Token'
        });

      }

      user.password =
        await bcrypt.hash(newPassword, 10);

      user.resetPasswordToken =
        undefined;

      user.resetPasswordExpires =
        undefined;

      await user.save();

      res.json({
        message:
          'Password Reset Successful'
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: 'Server Error'
      });

    }

  }
);

module.exports = router;