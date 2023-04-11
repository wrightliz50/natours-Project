const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must include text'],
      // minlength: [10, 'A review must have at least 10 characters'],
      // maxlength: [40, 'A review must be less than 40 characters'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have a user'],
    },
  },
  // make virtual properties visible in output
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//populates all user and tour fields for the review
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  //.populate({
  //   path: 'tour',
  //   select: 'name',
  // });
  next();
});

//static method (so we can aggregate) to create statitics for tour ID for review being created
reviewSchema.statics.calcAvgerageRatings = async function (tourId) {
  //this is referring to the Review model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);
  //save stats to the tour if there are still reviews, if no reviews, use default
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//call static method after new review is saved (use this.constructor to bind to current Model)
reviewSchema.post('save', function () {
  //this is referring to the current review
  this.constructor.calcAvgerageRatings(this.tour);
});

// use pre save method to get tour data and pass to post middleware
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

// take review data from pre middleware and update tour rating data based on updated or deleted review
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne() does not work on post function because query is already executed
  await this.r.constructor.calcAvgerageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// POST /tour/tourID/reviews (nested route - reviews is child of tours)
// GET /tour/tourID/reviews/reviewID
