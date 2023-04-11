const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less than 40 char'],
      minlength: [10, 'A tour name must have more than 10 chars'],
      //validate: [validator.isAlpha, 'A tour name must only include characters'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      minRating: [1, 'Rating must be above 1.0'],
      maxRating: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      //validate: {
      //validator: function (val) {
      //// Only works on create not update docs - this only points to current doc on NEW DOCUMENT
      //return val < this.price;
      //},
      //message: 'Discount price {{VALUE}} should be below regular price',
      //},
    },
    summary: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      //required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //geoJSON specifies geospatial data
      type: {
        type: String,
        default: 'Point',
        ennum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //reference to other model (ie user)
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  // make virtual properties appear in output
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// index properties in schema to improve read performance, can do single or compound index
//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Virtual property - property easy to calculate from given propertiess - not in DB
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate (instead of child referencing reviews, virtual populate)
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//Document MIDDLEWARE: runs before .save() and .create() - adds a slug to the tour
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
// AGGREGATION MIDDLEWARE - better to do on model than to try to remember to do on all applicable functions
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   //console.log(this.pipeline());
//   next();
// });

//Embed users into tours - use guides: Array in schema
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save',function(next){
//   console.log('Will save document...')
//   next();
// });

// tourSchema.post('save', function(doc,next){
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  //  tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//populates all guides fields with user data
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms`);
  //console.log(docs);
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
