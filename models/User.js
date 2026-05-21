const mongoose = require('mongoose');

/* =========================================
   COMPANY SCHEMA
========================================= */

const CompanyKeySchema =
  new mongoose.Schema(

    {
      name: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 120
      },

      secretPhraseHash: {
        type: String,
        required: true
      },

      currency: {
        type: String,
        default: 'USD',
        trim: true,
        maxlength: 10
      },

      timezone: {
        type: String,
        default: 'Africa/Johannesburg',
        trim: true,
        maxlength: 100
      },

      fiscalYearStart: {
        type: String,
        default: 'January',
        trim: true,
        maxlength: 30
      },

      dealStages: {
        type: [String],
        default: [
          'Lead',
          'Contact',
          'Negotiation',
          'Closed Deal'
        ]
      },

      customFieldDefinitions: {
        type: [String],
        default: []
      },

      isPremium: {
        type: Boolean,
        default: false
      }

    },

    {
      timestamps: true
    }

  );

/* =========================================
   USER SCHEMA
========================================= */

const UserSchema =
  new mongoose.Schema(

    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
      },

      email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 120
      },

      password: {
        type: String,
        required: true
      },

      companyGroup: {
        type: String,
        default: 'individual',
        trim: true,
        lowercase: true,
        maxlength: 120,
        index: true
      },

      role: {
        type: String,

        enum: [
          'Admin',
          'Manager',
          'Standard Agent'
        ],

        default: 'Admin'
      },

      resetPasswordToken: {
        type: String,
        default: null
      },

      resetPasswordExpires: {
        type: Date,
        default: null
      }

    },

    {
      timestamps: true
    }

  );

/* =========================================
   INDEXES
========================================= */

UserSchema.index({
  email: 1
});

UserSchema.index({
  companyGroup: 1
});

CompanyKeySchema.index({
  name: 1
});

/* =========================================
   EXPORTS
========================================= */

const CompanyKey =
  mongoose.models.CompanyKey ||
  mongoose.model(
    'CompanyKey',
    CompanyKeySchema
  );

const User =
  mongoose.models.User ||
  mongoose.model(
    'User',
    UserSchema
  );

module.exports = {
  User,
  CompanyKey
};