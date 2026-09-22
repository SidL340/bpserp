const https = require('https');

/**
 * Send SMS via Sparrow SMS API (Nepal)
 * @param {string} to - Recipient 10-digit mobile number
 * @param {string} message - Message text
 */
async function sendSparrowSms(to, message) {
  if (!process.env.SMS_API_KEY) {
    // If no SMS key configured, gracefully log and return
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [SMS Simulated] To: ${to} | Message: ${message}`);
    }
    return { success: true, simulated: true };
  }

  const cleanTo = String(to).replace(/[^0-9]/g, '');
  if (!cleanTo || cleanTo.length < 10) {
    return { success: false, message: 'Invalid phone number.' };
  }

  const params = new URLSearchParams({
    token: process.env.SMS_API_KEY,
    from: process.env.SMS_FROM || 'Brindawan',
    to: cleanTo,
    text: message,
  });

  return new Promise((resolve, reject) => {
    const baseUrl = process.env.SMS_API_URL || 'https://api.sparrowsms.com/v2/sms/';
    const url = `${baseUrl}?${params.toString()}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ success: true, data }));
    }).on('error', (err) => {
      console.error('SMS Send Error:', err.message);
      resolve({ success: false, error: err.message });
    });
  });
}

module.exports = { sendSparrowSms };
