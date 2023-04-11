/* eslint-disable import/no-extraneous-dependencies */
const nodemailer = require('nodemailer');
const pug = require('pug');
//const htmlToText = require('html-to-text');

// complex email send
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Liz <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return 1;
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on pug template

    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      //text: htmlToText.fromString(html),
    };

    //3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Team');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'PasswordReset valid for 10 minutes');
  }
};

//simple email send
// const sendEmail = async (options) => {
//   // 1. Create a transporter
//   // const transporter = nodemailer.createTransport({
//   //   host: process.env.EMAIL_HOST,
//   //   port: process.env.EMAIL_PORT,
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   //   // Activate in gmail less secure app option (only user gmail for private app, user send grid or mailgun)
//   // });

//   // 2. Define email options
//   const mailOptions = {
//     from: 'Liz <liz@test.com>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     //html
//   };
//   // 3. Actually send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
