const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIfeatures = require('../utils/apifeatures');

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //to allow nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // EXECUTE QUERY
    const features = new APIfeatures(Model.find(filter), req.query).filter().sort().limitfields().paginate();
    //const doc = await features.query.explain();
    const doc = await features.query;

    //const query = Tour.find(queryObj).where('duration').equals(5).where('difficulty').equals('easy');

    // SEND RESPONSE
    res.status(200).json({
      //JSend specification (status and then data wrapped as an object), results not part of JSend, use if data is longer than 1
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length, //nice to see how many tours there are that are sent to make sure it matches up
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    // catch invalid tour id
    if (!doc) {
      return next(new AppError('No tour found with that ID', 404));
    }

    res.status(200).json({
      //JSend specification (status and then data wrapped as an object), results not part of JSend, use if data is longer than 1
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
