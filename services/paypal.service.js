// services/paypal.service.js
const axios = require('axios');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Si Sentry no está disponible, creamos un mock
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.isLive = process.env.NODE_ENV === 'production';
    this.baseUrl = this.isLive 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Obtiene un token de acceso para la API de PayPal
   * @private
   * @returns {String} - Token de acceso
   */
  async _getAccessToken() {
    try {
      // TODO: IMPLEMENTAR REALMENTE - Obtener un token real de la API de PayPal
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/v1/oauth2/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        },
        data: 'grant_type=client_credentials'
      });

      return response.data.access_token;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener token de PayPal:', error.response?.data || error.message);
      throw new Error('No se pudo obtener token de acceso de PayPal');
    }
  }

  /**
   * Crea una orden de pago en PayPal
   * @param {Object} paymentData - Datos del pago
   * @returns {Object} - Resultado de la creación de la orden
   */
  async createOrder(paymentData) {
    try {
      const { amount, currency, orderId, returnUrl, cancelUrl } = paymentData;
      
      // TODO: IMPLEMENTAR REALMENTE - Crear una orden real en PayPal
      const accessToken = await this._getAccessToken();
      
      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2)
            }
          }
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'Coffee Shop',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      };
      
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/v2/checkout/orders`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        data: payload
      });
      
      return {
        success: true,
        orderId: response.data.id,
        approvalUrl: response.data.links.find(link => link.rel === 'approve').href,
        status: response.data.status
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear orden de PayPal:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Captura un pago aprobado por el usuario en PayPal
   * @param {String} paypalOrderId - ID de la orden de PayPal
   * @returns {Object} - Resultado de la captura
   */
  async capturePayment(paypalOrderId) {
    try {
      // TODO: IMPLEMENTAR REALMENTE - Capturar un pago real en PayPal
      const accessToken = await this._getAccessToken();
      
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return {
        success: true,
        transactionId: response.data.purchase_units[0].payments.captures[0].id,
        status: response.data.status,
        payerId: response.data.payer.payer_id,
        payerEmail: response.data.payer.email_address,
        amount: response.data.purchase_units[0].payments.captures[0].amount.value,
        currency: response.data.purchase_units[0].payments.captures[0].amount.currency_code
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al capturar pago de PayPal:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Reembolsa un pago de PayPal
   * @param {String} transactionId - ID de la transacción a reembolsar
   * @param {Number} amount - Monto a reembolsar
   * @param {String} currency - Moneda del reembolso
   * @param {String} reason - Razón del reembolso
   * @returns {Object} - Resultado del reembolso
   */
  async refundPayment(transactionId, amount, currency, reason) {
    try {
      // TODO: IMPLEMENTAR REALMENTE - Reembolsar un pago real en PayPal
      const accessToken = await this._getAccessToken();
      
      const payload = {
        amount: {
          value: amount.toFixed(2),
          currency_code: currency.toUpperCase()
        },
        note_to_payer: reason || 'Reembolso solicitado'
      };
      
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/v2/payments/captures/${transactionId}/refund`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        data: payload
      });
      
      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al reembolsar pago de PayPal:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new PayPalService();