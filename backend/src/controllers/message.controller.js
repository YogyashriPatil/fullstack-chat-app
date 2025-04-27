import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const deleteMessage = async (req, res) => {
  try {
    const { id:messageId } = req.params;
    if (!req.user) {
      return res.status(401).send("Unauthorized request");
    }    
    const userId = req.user._id;
    const message = await Message.findById(messageId);
    console.log(message)
    if (!message) {
      return res.status(404).send("Message not found");
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).send("You are not authorized to delete this message");
    }

    await Message.findByIdAndDelete(messageId);
    res.status(200).send("Message deleted successfully");

    // Emit delete event to the receiver
    const receiverSocketId = getReceiverSocketId(message.recieverId); // 
    if (receiverSocketId && io) {
      io.to(receiverSocketId).emit("deleteMessage", messageId);
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).send("Internal server error: " + error.message);
  }
};
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No video file uploaded');
    }

    // Upload the video to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Specify that it's a video
        folder: 'messages', // Folder in Cloudinary to store the video
      },
      async (error, result) => {
        if (error) {
          return res.status(500).send('Error uploading video');
        }

        const videoUrl = result.secure_url;

        // Assuming you have userId for sender and receiver
        const { senderId, receiverId } = req.body; // Make sure senderId and receiverId are sent

        // Create a new message with the video URL
        const newMessage = new Message({
          senderId,
          receiverId,
          text: '', // Empty text for video messages
          videoUrl,
          createdAt: new Date(),
        });

        await newMessage.save();

        // Emit delete event to the receiver (real-time communication via Socket.io)
        if (io) {
          // Emit to the receiver's socket room
          io.to(receiverId).emit('newVideoMessage', { videoUrl, senderId });
        }

        res.status(200).send({ videoUrl }); // Send the video URL back to the frontend
      }
    );

    req.pipe(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error uploading video');
  }
};
