const mongoose = require('mongoose');
const dotenv = require('dotenv');

//handle uncaught errors such as undefined value being called
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION: Shutting down...');
  process.exit(1);
});
dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
//console.log(DB);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection successful');
  });

// START SERVER

//console.log(process.env);
const port = process.env.port || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// handle unhandled rejection like password to mongodb incorrect
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION: Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
