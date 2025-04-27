import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import EmptyChat from "./skeletons/EmptyChat.jsx";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash } from "lucide-react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagedelref = useRef(null);
  const socketRef = useRef(null);
  
  const [msg, setMsg] = useState(false);

  useEffect(() => {
    // Fetch messages for selectedUser
    getMessages(selectedUser._id);
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:5001"); // Change this URL to your socket server URL
    }
    socketRef.current.on("deletedMessage", async ({ messageId }) => {
        console.log("Message deleted:", messageId);
        setMsg(!msg); // Force re-render to fetch updated messages
      });
    

    // Cleanup socket on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off("deletedMessage");
        socketRef.current.close();  // Close socket on unmount
      }
    };
  }, [selectedUser._id, getMessages, msg]);

  useEffect(() => {
    if (messageEndRef.current && messages.length) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    toast((t) => (
      <div className="flex flex-col gap-2 w-80 justify-center align-middle">
        <span>Delete this message?</span>
        <div className="flex gap-2 justify-center align-middle">
          <button
            className="bg-gray-200 px-3 py-1 rounded-md text-sm hover:bg-gray-300 text-center"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 px-3 py-1 rounded-md text-sm text-white hover:bg-red-600 text-center"
            ref={messagedelref}
            onClick={async () => {
              await deleteMessage(messageId);
              toast.dismiss(t.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
    });
  };

  // Handle video file selection
  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
  };

  // Send the video message
  const sendVideo = async () => {
    if (!videoFile) return;

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("senderId", authUser._id); // Use authUser._id for sender
    formData.append("receiverId", selectedUser._id);

    try {
      const res = await axios.post("http://localhost:5001/api/message/video", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Video uploaded successfully:", res.data.videoUrl);

      // Add the video to the local messages state (for the sender's chat)
      setMessages((prevMessages) => [
        ...prevMessages,
        { senderId: authUser._id, videoUrl: res.data.videoUrl },
      ]);

      // Emit video message to receiver via socket
      socketRef.current.emit("sendVideoMessage", {
        senderId: authUser._id,
        receiverId: selectedUser._id,
        videoUrl: res.data.videoUrl,
      });
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <EmptyChat />
        <MessageInput />
      </div>
    );
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={message.senderId === authUser._id ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
              {message.senderId === authUser._id && (
                <button
                  className="text-xs opacity-50 hover:opacity-100 transition-opacity"
                  title="Delete message"
                  ref={messagedelref}
                  onClick={async () => handleDeleteMessage(message._id)}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </button>
              )}
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.videoUrl && (
                <video width="300" controls className="rounded-md mb-2">
                  <source src={message.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
