/**
 * Test Reminder Utility
 * Create a test reminder for immediate testing
 */
import reminderManager from '../services/reminderManager';

export const createTestReminder = async (minutesFromNow = 1) => {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + minutesFromNow * 60000);

    const testReminder = {
      name: 'Shivam Test Client',
      phone: '9876543210',
      contactNumber: '9876543210',
      location: 'Noida, UP',
      reminderTime: reminderTime.toISOString(),
      reminderDateTime: reminderTime.toISOString(),
      note: 'This is a test reminder for Week/Action',
      title: 'Test Enquiry Reminder: Shivam',
      productType: 'Commercial',
      caseStatus: 'Open',
      source: 'OLX',
      majorComments: 'Looking for office space',
      address: 'Sector 62, Noida',
      referenceBy: '',
      clientCode: 'CC694',
      projectCode: 'PC694',
      serialNumber: '694',
      enquiryId: 'test_enquiry_123',
      actionPlan: 'Call and schedule site visit',
      status: 'pending',
    };

    await reminderManager.addReminder(testReminder);
    
    console.log(`✅ Test reminder created for ${minutesFromNow} minute(s) from now`);
    console.log('Reminder time:', reminderTime.toLocaleString());
    
    return testReminder;
  } catch (error) {
    console.error('❌ Error creating test reminder:', error);
    throw error;
  }
};

// For testing - create a reminder that triggers in 30 seconds
export const createImmediateTestReminder = async () => {
  return createTestReminder(0.5); // 30 seconds
};

export default { createTestReminder, createImmediateTestReminder };
