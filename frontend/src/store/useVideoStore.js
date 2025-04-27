// useVideoStore.js
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import { useChatStore } from "./useChatStore";

// const iceServers = {
//   iceServers: [
//     // ✅ Xirsys STUN & TURN servers
//     { urls: "stun:bn-turn2.xirsys.com" },
//     { urls: "turn:bn-turn2.xirsys.com:80?transport=udp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },
//     { urls: "turn:bn-turn2.xirsys.com:3478?transport=udp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },
//     { urls: "turn:bn-turn2.xirsys.com:80?transport=tcp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },
//     { urls: "turn:bn-turn2.xirsys.com:3478?transport=tcp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },
//     { urls: "turns:bn-turn2.xirsys.com:443?transport=tcp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },
//     { urls: "turns:bn-turn2.xirsys.com:5349?transport=tcp", username: "MSBZEfd7lYvl9bbpeBDyNwFf5MBO8sO95sG33Fuo3uL-_HPFPBPMOj7_Okm0T4piAAAAAGeuEllNYW5hcw==", credential: "ceb2c206-ea20-11ef-8265-0242ac140004" },

//     // ✅ Google STUN servers (for backup)
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//     { urls: "stun:stun2.l.google.com:19302" },
//     { urls: "stun:stun3.l.google.com:19302" },
//     { urls: "stun:stun4.l.google.com:19302" }
//   ]
// };

const iceServers = {
  iceServers: [
    { urls: "stun:turn.cloudflare.com:3478" }, // ✅ Cloudflare STUN (UDP)
    
    { // ✅ Cloudflare TURN (UDP)
      urls: "turn:turn.cloudflare.com:3478?transport=udp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb"
    },

    { // ✅ Cloudflare TURN (TCP - Port 3478)
      urls: "turn:turn.cloudflare.com:3478?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb"
    },

    { // ✅ Cloudflare TURN (TLS over TCP - Port 5349)
      urls: "turns:turn.cloudflare.com:5349?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb"
    },

    { // ✅ Cloudflare TURN (TLS over TCP - Port 443 for firewall bypass)
      urls: "turns:turn.cloudflare.com:443?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb"
    }
  ]
};


export const useVideoStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  callStatus: null,
  peer: null,
  incomingCall: null,
  iceCandidatesQueue: [],

  initializeMedia: async () => {
    if (get().localStream) return get().localStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      set({ localStream: stream });
      console.log("Local stream initialized successfully");
      return stream;
    } catch (error) {
      toast.error("Cannot access camera/microphone. Please check permissions.");
      console.error("Media access error:", error);
      throw error;
    }
  },

  makeCall: async (userId) => {
    try {
      const stream = await get().initializeMedia();
      const socket = useAuthStore.getState().socket;
      const currentUser = useAuthStore.getState().authUser;

      const peer = new RTCPeerConnection(iceServers);
      
      // Create remote stream immediately
      const remoteStream = new MediaStream();
      set({ remoteStream, peer });

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      // Handle incoming tracks
      peer.ontrack = (event) => {
  set((state) => {
    const newStream = state.remoteStream || new MediaStream();
    event.streams[0].getTracks().forEach((track) => newStream.addTrack(track));
    return { remoteStream: newStream };
  });
};


      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: userId,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log("Connection state changed:", peer.connectionState);
        if (peer.connectionState === "connected") {
          set({ callStatus: "connected" });
        } else if (peer.connectionState === "disconnected") {
          get().endCall();
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", peer.iceConnectionState);
        if (peer.iceConnectionState === "failed") {
          toast.error("Connection failed. Please retry.");
          get().endCall();
        }
      };


      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      socket.emit("call-user", {
        to: userId,
        from: currentUser._id,
        signal: offer,
      });

      set({ callStatus: "outgoing" });
      console.log("Call made and local description set:", offer);
    } catch (error) {
      toast.error("Failed to start call");
      console.error("Call initiation error:", error);
      get().endCall();
    }
  },

  handleIncomingCall: async ({ from, signal }) => {
    try {
      const stream = await get().initializeMedia();
      
      set({
        incomingCall: { from, signal },
        callStatus: "incoming",
        localStream: stream
      });
    } catch (error) {
      console.error("Error handling incoming call:", error);
      get().endCall();
    }
  },

 answerCall: async () => {
  const { incomingCall } = get();
  if (!incomingCall) return;

  try {
    const localStream = await get().initializeMedia();
    const peer = new RTCPeerConnection(iceServers);

    // Create remote stream immediately
    const remoteStream = new MediaStream();
    set({ remoteStream, peer });

    // Add local tracks to peer connection
    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    // Handle incoming tracks
    peer.ontrack = (event) => {
      set((state) => {
        const newStream = state.remoteStream || new MediaStream();
        event.streams[0].getTracks().forEach((track) => newStream.addTrack(track));
        return {remoteStream: newStream };
      });
    };

    // Queue ICE candidates if remote description is not set yet
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = useAuthStore.getState().socket;
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: incomingCall.from,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      console.log("Connection state changed:", peer.connectionState);
      if (peer.connectionState === "connected") {
        set({ callStatus: "connected" });
      } else if (peer.connectionState === "disconnected") {
        get().endCall();
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", peer.iceConnectionState);
      if (peer.iceConnectionState === "failed") {
        toast.error("Connection failed. Please retry.");
        get().endCall();
      }
    };

    // Set remote description first
    await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

    // Process queued ICE candidates **after** setting remote description
    get().iceCandidatesQueue.forEach(async (candidate) => {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    });
    set({ iceCandidatesQueue: [] });

    // Create and send answer
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    const socket = useAuthStore.getState().socket;
    socket.emit("answer-call", {
      to: incomingCall.from,
      signal: answer,
    });

    set({ callStatus: "connected" });

  } catch (error) {
    console.error("Error answering call:", error);
    get().endCall();
  }
},


handleIceCandidate: async ({ candidate }) => {
  const { peer, iceCandidatesQueue } = get();
  try {
    if (!peer || !candidate) return;

    if (!peer.remoteDescription) {
      // Queue ICE candidate until remote description is set
      set((state) => ({
        iceCandidatesQueue: [...state.iceCandidatesQueue, candidate],
      }));
      console.log("Queued ICE candidate:", candidate);
    } else {
      // Add received candidate immediately
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("Added ICE candidate:", candidate);

      // Process any queued candidates (if any)
      if (iceCandidatesQueue.length > 0) {
        console.log("Processing queued ICE candidates...");
        for (const queuedCandidate of iceCandidatesQueue) {
          await peer.addIceCandidate(new RTCIceCandidate(queuedCandidate));
        }
        set({ iceCandidatesQueue: [] }); // Clear queue after processing
      }
    }
  } catch (error) {
    console.error("Error handling ICE candidate:", error);
  }
},


  endCall: () => {
    const { peer, localStream, remoteStream } = get();
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = useChatStore.getState();
  
    if (peer) {
      peer.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    set({
      peer: null,
      localStream: null,
      remoteStream: null,
      callStatus: null,
      incomingCall: null,
      iceCandidatesQueue: [],
    });

    if (selectedUser?._id) {
      socket.emit("end-call", { to: selectedUser._id });
    }
  },
}));
