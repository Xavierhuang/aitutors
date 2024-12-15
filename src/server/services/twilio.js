import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function makePhoneCall(phoneNumber, message) {
  try {
    const call = await client.calls.create({
      twiml: `<Response><Say>${message}</Say></Response>`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    return {
      success: true,
      callId: call.sid
    };
  } catch (error) {
    console.error('Twilio call error:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 