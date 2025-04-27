import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize,
  Minimize,
  PhoneIncoming,
} from "lucide-react";
import { useVideoStore } from "../store/useVideoStore";
import { useChatStore } from "../store/useChatStore";

const VideoInterface = ({ callType, onClose }) => {
  const {
    localStream,
    remoteStream,
    answerCall,
    endCall,
    callStatus
  } = useVideoStore();

  const { selectedUser } = useChatStore();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isIncoming,setIsIncoming] = useState(callType === "incoming");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStreamInitialized, setLocalStreamInitialized] = useState(false);  
  const [remoteStreamInitialized, setRemoteStreamInitialized] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // Handle local stream
  // Handle local stream
useEffect(() => {
  if (localStream && localVideoRef.current) {
    console.log("Setting local stream...");
    localVideoRef.current.srcObject = localStream;
  }

  const localVideoElement = localVideoRef.current;

  return () => {
    if (localVideoElement) {
      localVideoElement.srcObject = null; // Cleanup
    }
  };
}, [localStream, localStreamInitialized]);

// Handle remote stream
useEffect(() => {
  if (remoteStream && remoteVideoRef.current) {
    console.log("Setting remote stream...");
    remoteVideoRef.current.srcObject = remoteStream;
  }

  const remoteVideoElement = remoteVideoRef.current;

  return () => {
    if (remoteVideoElement) {
      remoteVideoElement.srcObject = null; // Cleanup
    }
  };
}, [remoteStream, remoteStreamInitialized]);

// Ensure local and remote streams are updated after answering a call
useEffect(() => {
  if (callStatus === "connected" && localStream && remoteStream) {
    console.log("Updating video elements after call connection...");
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      setLocalStreamInitialized(true);
      setRemoteStreamInitialized(true);
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    setIsConnecting(false);
  }
}, [callStatus, localStream, remoteStream, localStreamInitialized, remoteStreamInitialized]);


  const handleAcceptCall = async () => {

    try {
      await answerCall();
      setIsIncoming(false);
      
      console.log("Call answered successfully");
    } catch (error) {
      console.error("Error answering call:", error);
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose();
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      console.log(audioTrack);
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const getCallStatusText = () => {
    if (isIncoming && isConnecting) return "Incoming call from";
    if (callType === "outgoing" && isConnecting) return "Calling";
    return "Connected with";
  };

  // Incoming Call UI
  if (isIncoming && isConnecting) {
    return (
      <div className="fixed inset-0 bg-base-300/90 z-50 flex items-center justify-center">
        <div className="bg-base-100 p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
          <PhoneIncoming size={48} className="text-primary" />
          <p className="text-lg font-semibold mt-4">
            {getCallStatusText()} {selectedUser?.fullName || "User"}
          </p>
          
          {localStream && (
            <div className="w-64 h-48 mt-4 bg-base-200 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex gap-4 mt-6">
            <button onClick={handleAcceptCall} className="btn btn-success">
              Accept
            </button>
            <button onClick={handleEndCall} className="btn btn-error">
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main call UI
  return (
    <div className="fixed inset-0 bg-base-300/90 z-50">
      <div className="relative h-full flex items-center justify-center">
        <div
          className={`relative rounded-lg overflow-hidden flex flex-col shadow-lg border border-base-200 
          ${isFullScreen ? "w-screen h-screen" : "w-[800px] h-[600px]"}`}
        >
          <div className="flex-1 bg-base-200 relative">
            {/* Remote Video */}
            <div className="absolute inset-0">
              {!remoteStream || isConnecting ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-primary text-lg font-semibold">
                      {getCallStatusText()} {selectedUser?.fullName || "User"}
                    </p>
                  </div>
                </div>
              ) : (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Local Video */}
            {localStream && (
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-base-100 rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="h-20 bg-base-100 flex items-center justify-center gap-4 px-4">
            <button
              onClick={toggleAudio}
              className={`btn btn-circle ${audioEnabled ? 'btn-primary' : 'btn-error'}`}
            >
              {audioEnabled ? <Mic /> : <MicOff />}
            </button>

            <button
              onClick={toggleVideo}
              className={`btn btn-circle ${videoEnabled ? 'btn-primary' : 'btn-error'}`}
            >
              {videoEnabled ? <Video /> : <VideoOff />}
            </button>

            <button onClick={handleEndCall} className="btn btn-circle btn-error">
              <PhoneOff />
            </button>

            <button
              onClick={toggleFullScreen}
              className="btn btn-circle btn-primary"
            >
              {isFullScreen ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoInterface;