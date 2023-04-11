/* eslint-disable */
import axios from 'axios';
const stripe = Stripe('pk_test_51MvPs0Bzv5MSS2iTSlgGP7uVrmAqlmnHVIDdfFFB5b7BVoOvOIFLmmOFUZUzKfOAU8WAPT0DIdarziIbjM03lial00EluORSre');

export const bookTour = async (tourId) => {
  // 1) Get session from API
  const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout/${tourId}`);
  console.log(session);
  console.log('did it');
  // 2) Create checkout form + process credit card
};
