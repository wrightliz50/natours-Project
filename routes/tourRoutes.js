const express = require('express');
const tourController = require('../controllers/tourControllers');
const authController = require('../controllers/authController');
//const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

//mount router to allow for nested route
router.use('/:tourId/reviews', reviewRouter);

//middleware for certain param, only runs when that id happens
//router.param('id', tourController);
// router.param('body', tourController.checkBody);

router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan);

router.route('/tours-within/:distance/center/:latlong/unit/:unit').get(tourController.getToursWithin);

router.route('/distances/:latlong/unit/:unit').get(tourController.getDistances);

router.route('/').get(tourController.getAllTours).post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

//router.route('/:tourId/reviews').post(authController.protect, authController.restrictTo('user'), reviewController.createReview);

module.exports = router;
