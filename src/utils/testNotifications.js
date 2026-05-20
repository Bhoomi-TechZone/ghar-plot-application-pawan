import { addPropertyNotification } from '../utils/notificationManager';

/**
 * Test property notification when property is added
 * This simulates the backend notification process
 */
export const simulatePropertyAddedNotification = async (propertyData) => {
  try {
    // Simulate what backend would send
    const notification = await addPropertyNotification({
      _id: propertyData._id || Date.now().toString(),
      description: propertyData.description || 'New Property',
      propertyLocation: propertyData.propertyLocation || 'Unknown Location',
      price: propertyData.price || 0,
      photosAndVideo: propertyData.photosAndVideo || []
    });

    console.log('✅ Property notification simulated:', notification);
    return notification;
  } catch (error) {
    console.error('❌ Error simulating property notification:', error);
    return null;
  }
};

/**
 * Simulate inquiry notification
 */
export const simulateInquiryNotification = async (propertyId, inquirerName) => {
  try {
    const { addInquiryNotification } = await import('../utils/notificationManager');
    
    const notification = await addInquiryNotification({
      inquiryId: Date.now().toString(),
      propertyId: propertyId,
      inquirerName: inquirerName || 'Anonymous User'
    });

    console.log('✅ Inquiry notification simulated:', notification);
    return notification;
  } catch (error) {
    console.error('❌ Error simulating inquiry notification:', error);
    return null;
  }
};

/**
 * Simulate chat notification
 */
export const simulateChatNotification = async (senderName, message) => {
  try {
    const { addChatNotification } = await import('../utils/notificationManager');
    
    const notification = await addChatNotification({
      chatId: Date.now().toString(),
      senderId: 'test_user',
      senderName: senderName || 'Unknown User',
      message: message || 'Hello!'
    });

    console.log('✅ Chat notification simulated:', notification);
    return notification;
  } catch (error) {
    console.error('❌ Error simulating chat notification:', error);
    return null;
  }
};