/**
 * paymentapi.js
 * Simple wrapper for payments endpoints:
 * - POST /api/services/payment/create-order
 * - POST /api/services/payment/verify
 */
import { post } from './api';

/**
 * Create an order on the server (Razorpay order creation proxy).
 * @param {Object} data - payload for order creation (amount in paise, currency, receipt, notes...)
 * @returns {Promise<Object>} - { success, order, key }
 */
export const createOrder = async (data = {}) => {
    try {
        console.log('[paymentapi] createOrder payload:', data);
        const res = await post('/api/services/payment/create-order', data);
        console.log('[paymentapi] createOrder response:', res);
        return res;
    } catch (err) {
        console.error('[paymentapi] createOrder failed:', err);
        throw err;
    }
};

/**
 * Verify a payment on the server.
 * The backend expects details like razorpay_payment_id, razorpay_order_id, razorpay_signature
 * @param {Object} data - { razorpay_payment_id, razorpay_order_id, razorpay_signature, ... }
 */
export const verifyPayment = async (data = {}) => {
    try {
        const res = await post('/api/services/payment/verify', data);
        console.log('[paymentapi] verifyPayment response:', res);
        return res;
    } catch (err) {
        console.error('[paymentapi] verifyPayment failed:', err);
        throw err;
    }
};

/**
 * Submit a service booking/request to the backend.
 * Backend endpoint name may vary; this uses `/api/services/request` which is a common pattern.
 * If your backend uses a different path, update this function accordingly.
 */
export const submitServiceRequest = async (data = {}) => {
    try {
        console.log('[paymentapi] submitServiceRequest payload:', data);
        
        // Try the main endpoint first
        try {
            const res = await post('/api/services/request', data);
            console.log('[paymentapi] submitServiceRequest response:', res);
            return res;
        } catch (apiErr) {
            // If 404, backend endpoint doesn't exist yet
            if (apiErr.message && apiErr.message.includes('404')) {
                console.warn('[paymentapi] Backend endpoint not ready. Using mock success response.');
                console.warn('[paymentapi] ⚠️ IMPORTANT: Implement backend endpoint /api/services/request');
                console.log('[paymentapi] Booking data that should be saved:', JSON.stringify(data, null, 2));
                
                // Return mock success response for development
                return {
                    success: true,
                    status: 'success',
                    message: 'Booking received (mock mode - backend pending)',
                    data: {
                        bookingId: `MOCK_${Date.now()}`,
                        ...data
                    },
                    warning: 'Backend endpoint /api/services/request not implemented yet. This is a mock response.'
                };
            }
            throw apiErr;
        }
    } catch (err) {
        console.error('[paymentapi] submitServiceRequest failed:', err);
        throw err;
    }
};

export default {
    createOrder,
    verifyPayment,
};
