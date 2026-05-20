/**
 * Enhanced Chat Controller with Better Notification Integration
 * Integrates with the universal notification system
 */

import Chat from "../models/chatSchema.js";
import User from "../models/user.js";
import admin from "firebase-admin";
import fs from "fs";
import { sendPushNotification } from "../utils/sendNotification.js";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
);

// 🔹 Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Enhanced sendMessage with better notification handling
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { chatId, text } = req.body;

    if (!chatId || !text?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "chatId and text are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });

    // 🔹 Save new message
    const newMessage = {
      sender: senderId,
      text,
      isRead: false,
      createdAt: new Date(),
    };
    chat.messages.push(newMessage);
    await chat.save();

    // 🔹 Emit via socket.io (real-time)
    if (req.io) {
      req.io.to(chatId).emit("newMessage", { chatId, message: newMessage });
    }

    // 🔹 Find receiver and sender details
    const receiverId = chat.participants.find((p) => p.toString() !== senderId);
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);

    // 🔹 Enhanced FCM notification with proper data structure
    if (receiver?.fcmToken) {
      const notificationPayload = {
        token: receiver.fcmToken,
        notification: {
          title: `💬 ${sender.fullName}`,
          body: text.length > 50 ? text.substring(0, 50) + "..." : text,
        },
        data: {
          type: 'chat',           // ✅ Matches our notification system
          chatId: chatId.toString(),
          senderId: senderId.toString(),
          senderName: sender.fullName,
          action: 'open_chat',    // ✅ For navigation handling
          propertyId: chat.propertyId?.toString() || '', // If chat is property-related
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#0D47A1',
            defaultSound: true,
            defaultVibratePattern: true,
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            }
          }
        }
      };

      try {
        // Send via Firebase Admin SDK
        await admin.messaging().send(notificationPayload);
        console.log(`✅ Chat notification sent to ${receiver.fullName}`);
        
        // Also call your existing sendPushNotification as backup
        await sendPushNotification(
          receiver.fcmToken,
          `💬 ${sender.fullName}`,
          text,
          {
            type: 'chat',
            chatId: chatId.toString(),
            senderId: senderId.toString(),
            senderName: sender.fullName,
            action: 'open_chat'
          }
        );
      } catch (fcmError) {
        console.error("❌ FCM notification failed:", fcmError);
        
        // Try fallback notification method
        try {
          await sendPushNotification(
            receiver.fcmToken,
            `💬 ${sender.fullName}`,
            text,
            {
              type: 'chat',
              chatId: chatId.toString(),
              senderId: senderId.toString(),
            }
          );
        } catch (fallbackError) {
          console.error("❌ Fallback notification also failed:", fallbackError);
        }
      }
    } else {
      console.log("⚠️ Receiver has no FCM token registered");
    }

    res.status(200).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error in sendMessage:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Enhanced getOrCreateChat with better error handling
 */
export const getOrCreateChat = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, propertyId } = req.body; // ✅ Added propertyId for context

    if (!receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "receiverId is required" });
    }

    // Prevent user from creating chat with themselves
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot create chat with yourself" });
    }

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    })
      .populate("participants", "fullName email avatar")
      .lean();

    if (!chat) {
      const newChatData = { 
        participants: [senderId, receiverId],
        ...(propertyId && { propertyId }) // Add property context if provided
      };
      
      const newChat = new Chat(newChatData);
      const savedChat = await newChat.save();

      chat = await Chat.findById(savedChat._id)
        .populate("participants", "fullName email avatar")
        .lean();
    }

    res.status(200).json({ success: true, chat });
  } catch (err) {
    console.error("Error in getOrCreateChat:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Enhanced getChatHistory with unread count
 */
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: { $in: [userId] },
    })
      .populate("participants", "fullName email avatar")
      .populate("propertyId", "title location") // If chat is property-related
      .lean();

    const chatList = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId
      );

      const lastMessage =
        chat.messages.length > 0
          ? chat.messages[chat.messages.length - 1]
          : null;

      const unreadCount = chat.messages.filter(
        (m) => m.sender.toString() !== userId && !m.isRead
      ).length;

      return {
        chatId: chat._id,
        user: {
          _id: otherUser?._id,
          fullName: otherUser?.fullName,
          email: otherUser?.email,
          avatar: otherUser?.avatar,
        },
        property: chat.propertyId ? {
          _id: chat.propertyId._id,
          title: chat.propertyId.title,
          location: chat.propertyId.location
        } : null,
        lastMessage: lastMessage?.text || "No messages yet",
        lastMessageTime: lastMessage?.createdAt || chat.createdAt,
        unreadCount,
        totalMessages: chat.messages.length,
      };
    });

    // Sort by last message time (most recent first)
    chatList.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );

    res.status(200).json({ success: true, chats: chatList });
  } catch (err) {
    console.error("Error in getChatHistory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Enhanced getMessages with better read status handling
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: "chatId is required" });
    }

    const chat = await Chat.findById(chatId)
      .populate("participants", "fullName email avatar")
      .populate("messages.sender", "fullName email avatar")
      .populate("propertyId", "title location price");

    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(p => p._id.toString() === userId);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
    }

    // Identify receiver
    const receiver = chat.participants.find((p) => p._id.toString() !== userId);

    // Mark unread messages as read
    let updated = false;
    chat.messages.forEach((msg) => {
      if (msg.sender._id.toString() !== userId && !msg.isRead) {
        msg.isRead = true;
        updated = true;
      }
    });

    if (updated) await chat.save();

    res.status(200).json({
      success: true,
      receiverId: receiver?._id || null,
      receiverInfo: receiver,
      propertyInfo: chat.propertyId,
      messages: chat.messages,
      totalMessages: chat.messages.length,
    });
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Mark messages as read (separate endpoint)
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.body;

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: "chatId is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    }

    // Mark all unread messages from other users as read
    let markedCount = 0;
    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== userId && !msg.isRead) {
        msg.isRead = true;
        markedCount++;
      }
    });

    if (markedCount > 0) {
      await chat.save();
    }

    res.status(200).json({ 
      success: true, 
      message: `${markedCount} messages marked as read`,
      markedCount 
    });
  } catch (err) {
    console.error("Error in markMessagesAsRead:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get total unread messages count for user
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: { $in: [userId] },
    });

    let totalUnread = 0;
    chats.forEach(chat => {
      const unreadCount = chat.messages.filter(
        m => m.sender.toString() !== userId && !m.isRead
      ).length;
      totalUnread += unreadCount;
    });

    res.status(200).json({ 
      success: true, 
      unreadCount: totalUnread 
    });
  } catch (err) {
    console.error("Error in getUnreadCount:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Bulk notification sender for system messages
 * Useful for sending announcements to all users
 */
export const sendBulkChatAnnouncement = async (req, res) => {
  try {
    const { title, message, senderName = "System" } = req.body;

    if (!title || !message) {
      return res
        .status(400)
        .json({ success: false, message: "title and message are required" });
    }

    // Get all users with FCM tokens
    const users = await User.find({ 
      fcmToken: { $exists: true, $ne: null, $ne: "" } 
    }).select('fcmToken fullName');

    if (users.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No users with FCM tokens found",
        sentCount: 0,
        failedCount: 0
      });
    }

    const tokens = users.map(user => user.fcmToken);
    let sentCount = 0;
    let failedCount = 0;

    // Send multicast message
    const multicastMessage = {
      tokens: tokens,
      notification: {
        title: title,
        body: message,
      },
      data: {
        type: 'system_announcement',
        action: 'view_announcement',
        senderName: senderName,
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#0D47A1',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          }
        }
      }
    };

    try {
      const response = await admin.messaging().sendMulticast(multicastMessage);
      sentCount = response.successCount;
      failedCount = response.failureCount;

      console.log(`✅ Bulk announcement sent: ${sentCount} success, ${failedCount} failed`);
    } catch (error) {
      console.error("❌ Bulk announcement failed:", error);
      failedCount = tokens.length;
    }

    res.status(200).json({
      success: true,
      message: "Bulk announcement completed",
      sentCount,
      failedCount,
      totalUsers: users.length
    });
  } catch (err) {
    console.error("Error in sendBulkChatAnnouncement:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};