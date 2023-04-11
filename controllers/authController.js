/* eslint-disable import/no-extraneous-dependencies */
const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true, // prevents cross-side scripting attack - receive and send cookie only
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  //remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const url = `${req.protocol}://${req.get('host')}/me`;
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // 2. Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3. If everythin is ok, send token
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'successs' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it is there or use cookie as token if provided
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in', 401));
  }

  // 2) Validate token - verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user beloning to this token no longer exists', 401));
  }
  // 4) Check if user changed passowrd after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please log in again'), 401);
  }

  //Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = function (...roles) {
  return (req, res, next) => {
    //roles is an array - ['admin', 'lead-guides']
    //role to check permission for is coming from protect middleware
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission for this action', 403));
    }
    next();
  };
};

// only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  // if there is a jwt cookie, the user is logged in
  if (req.cookies.jwt) {
    try {
      // 2) Verify token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed passowrd after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //There is a logged-in user, make rendered page available
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTED email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email.', 404));
  }

  // 2. Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send as email
  // simple email send commeneted out
  //const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  //const message = `forgot password? Submit a new new password to ${resetURL}.\nIgnore this email if you did not request a reset`;
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'Password reset',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Email not sent, please try later', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  //find user for token and check if token has expired
  // 2. If token has not expired there is user, set new password
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. Update changedPasswordAt - done in the userModel

  // 4. Log user in
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from db
  const user = await User.findById(req.user.id).select('+password');
  // 2. Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }

  // 3. Update password if correct
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4. Log in user and send JWT
  createSendToken(user, 200, res);
});
