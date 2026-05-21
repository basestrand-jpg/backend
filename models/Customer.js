const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(

  {
    companyGroup: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    company: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: ''
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ''
    },

    value: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      trim: true,
      default: 'Lead',
      maxlength: 50
    },

    summary: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },

    customFields: {
      type: Map,
      of: String,
      default: {}
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

CustomerSchema.index({
  companyGroup: 1,
  status: 1
});

CustomerSchema.index({
  assignedTo: 1
});

/* =========================================
   EXPORT
========================================= */

module.exports =
  mongoose.models.Customer ||
  mongoose.model(
    'Customer',
    CustomerSchema
  );