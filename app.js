/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorControllers');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
// enable PUG for view engine - the V of MVC
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// 1) GLOBAL MIDDLEWARE - middleware stands between request and response
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// SET SECURITY HTTP Headers - disabled csp for login to work
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Development loggins
//console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// LIMIT REQUEST from same IP
//allow 100 requests from same ip within 1 hour, prevent brute force
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

//form parser
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser to parse data from cookies into req.cookie
app.use(cookieParser());

// Data sanitization  against NoSQL Quesry Injection
app.use(mongoSanitize());

//Data sanitazation agains XSS
app.use(xss());

// Prevent parameter pollution (clear up query string)
app.use(
  hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'],
  })
);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.cookies);

  next();
});

// 2) ROUTES

// mount view routes to app
app.use('/', viewRouter);

// mount routers onto a path - api routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//after all routes are checked for if undefined route, send 404 and message through middleware
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on server`), 404);
});

app.use(globalErrorHandler);

//Read data which will run in top level code and only run once

// 4) START SERVER from server.js

module.exports = app;
