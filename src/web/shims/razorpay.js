/**
 * Web shim for react-native-razorpay
 * Loads Razorpay's checkout.js dynamically and opens the payment dialog.
 */

const RazorpayCheckout = {
  open: (options) =>
    new Promise((resolve, reject) => {
      // Lazily load the Razorpay checkout script
      const loadScript = () =>
        new Promise((res, rej) => {
          if (window.Razorpay) { res(); return; }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = res;
          script.onerror = () => rej(new Error('Razorpay script failed to load'));
          document.head.appendChild(script);
        });

      loadScript()
        .then(() => {
          const rzp = new window.Razorpay({
            ...options,
            handler: (response) => resolve(response),
          });
          rzp.on('payment.failed', (response) =>
            reject({
              code: response.error.code,
              description: response.error.description,
            }),
          );
          rzp.open();
        })
        .catch(reject);
    }),
};

export default RazorpayCheckout;
