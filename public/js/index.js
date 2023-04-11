/* eslint-disable */

import '@babel/polyfill';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
//import { bookTour } from './stripe';

// DOM ELEMENTS
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const updateMeForm = document.querySelector('.form-user-data');
const passwordResetForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (updateMeForm)
  updateMeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    console.log(form);
    updateSettings(form, 'data');
  });

if (passwordResetForm)
  passwordResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings({ currentPassword, password, passwordConfirm }, 'password');

    // clear password fields
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
    document.querySelector('.btn--save-password').textContent = 'Save Password';
  });

// if (bookBtn)
//   bookBtn.addEventListener('click', (e) => {
//     e.target.textContent('Processing...');
//     const { tourId } = e.target.dataset;
//     bookTour(tourId);
//   });
