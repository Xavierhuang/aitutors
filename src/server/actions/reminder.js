import { makePhoneCall } from '../services/twilio.js';

let reminders = [];
let pendingRequests = new Map();

export async function scheduleReminder(type, time, message, phoneNumber = null) {
  const reminder = { type, time, message, phoneNumber };
  reminders.push(reminder);
  
  const timeInMs = parseTimeString(time);
  
  if (type === 'call') {
    if (!phoneNumber) {
      return {
        type: 'need_phone',
        message: 'Please provide your phone number to schedule the call.'
      };
    }
    
    setTimeout(async () => {
      const result = await makePhoneCall(phoneNumber, message);
      if (!result.success) {
        console.error('Failed to make call:', result.error);
      }
    }, timeInMs);
    
    return `Phone call scheduled for ${time} to ${phoneNumber}: "${message}"`;
  } else {
    setTimeout(() => {
      console.log(`REMINDER: ${message}`);
    }, timeInMs);
    
    return `Reminder scheduled for ${time}: "${message}"`;
  }
}

export function requestMoreInfo(requestType, currentInfo = '') {
  const requestId = Date.now().toString();
  pendingRequests.set(requestId, { requestType, currentInfo });
  
  const messages = {
    phoneNumber: "Please provide a phone number to make the call.",
    time: "When would you like to schedule this for?",
    purpose: "What's the purpose of this reminder/call?"
  };
  
  return {
    requestId,
    message: messages[requestType] || "Please provide more information.",
    currentInfo
  };
}

function parseTimeString(timeStr) {
  const number = parseInt(timeStr);
  if (timeStr.includes('minute') || timeStr.includes('min')) {
    return number * 60 * 1000;
  }
  if (timeStr.includes('hour')) {
    return number * 60 * 60 * 1000;
  }
  if (timeStr.includes('second') || timeStr.includes('sec')) {
    return number * 1000;
  }
  return 5 * 60 * 1000; // default to 5 minutes
} 