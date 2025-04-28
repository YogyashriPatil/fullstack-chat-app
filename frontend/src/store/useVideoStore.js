// useVideoStore.js
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
import toast from "react-hot-toast";

// ✅ ICE Servers
const iceServers = {
  iceServers: [
    { urls: "stun:turn.cloudflare.com:3478" },
    {
      urls: "turn:turn.cloudflare.com:3478?transport=udp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb",
    },
    {
      urls: "turn:turn.cloudflare.com:3478?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb",
    },
    {
      urls: "turns:turn.cloudflare.com:5349?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb",
    },
    {
      urls: "turns:turn.cloudflare.com:443?transport=tcp",
      username: "g0553dfdeb0bfb736b04c52d036e3d9caa1a4c7e9bc51f41af4d983337fb1170",
      credential: "07f391a1b52cb00cf67fdf5e3b7e2dd3fb471bbc918d639ad676464eefc4ffeb",
    }
  ]
};

export const useVideoStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  peer: null,
  incomingCall: null,
  callStatus: null,
  iceCandidatesQueue: [],

  initializeMedia: async () => {
    if (get().localStream) return get().localStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      set({ localStream: stream });
      console.log("✅ Local media stream initialized");
      return stream;
    } catch (error) {
      toast.error("Cannot access camera/mic. Please check permissions.");
      console.error(error);
      throw error;
    }
  },

  makeCall: async (userId) => {
    try {
      const socket = useAuthStore.getState().socket;
      const currentUser = useAuthStore.getState().authUser;

      const localStream = await get().initializeMedia();
      const peer = new RTCPeerConnection(iceServers);
      const remoteStream = new MediaStream();

      // Save streams and peer
      set({ peer, remoteStream });

      // Add local tracks
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

      // When receiving remote tracks
      peer.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        set({ remoteStream });
      };

      // Handle ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, to: userId });
        }
      };

      // Connection state changes
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log("Connection state:", state);
        if (state === "connected") {
          set({ callStatus: "connected" });
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
          get().endCall();
        }
      };

      // Create and send offer
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("call-user", {
        to: userId,
        from: currentUser._id,
        signal: offer,
      });

      set({ callStatus: "outgoing" });
      console.log("📞 Calling user...");
    } catch (error) {
      console.error("Error making call:", error);
      toast.error("Failed to start call");
      get().endCall();
    }
  },

  handleIncomingCall: async ({ from, signal }) => {
    try {
      await get().initializeMedia();
      set({
        incomingCall: { from, signal },
        callStatus: "incoming",
      });
      console.log("📥 Incoming call...");
    } catch (error) {
      console.error("Error handling incoming call:", error);
    }
  },

  answerCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      const socket = useAuthStore.getState().socket;
      const localStream = await get().initializeMedia();
      const peer = new RTCPeerConnection(iceServers);
      const remoteStream = new MediaStream();

      set({ peer, remoteStream });

      // Add local tracks
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

      peer.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        set({ remoteStream });
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, to: incomingCall.from });
        }
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log("Connection state:", state);
        if (state === "connected") {
          set({ callStatus: "connected" });
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
          get().endCall();
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

      // Apply any queued ICE candidates
      const queuedCandidates = get().iceCandidatesQueue;
      for (const candidate of queuedCandidates) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
      set({ iceCandidatesQueue: [] });

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer-call", { to: incomingCall.from, signal: answer });

      set({ callStatus: "connected" });
      console.log("✅ Answered call");
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Failed to answer call");
      get().endCall();
    }
  },

  handleIceCandidate: async ({ candidate }) => {
    const { peer } = get();
    if (!peer || !candidate) return;

    try {
      if (peer.remoteDescription && peer.remoteDescription.type) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Remote description not set yet, queue candidate
        set((state) => ({
          iceCandidatesQueue: [...state.iceCandidatesQueue, candidate],
        }));
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  },

  endCall: () => {
    const { peer, localStream, remoteStream } = get();
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = useChatStore.getState();

    if (peer) peer.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());

    set({
      peer: null,
      localStream: null,
      remoteStream: null,
      incomingCall: null,
      callStatus: null,
      iceCandidatesQueue: [],
    });

    if (selectedUser?._id) {
      socket.emit("end-call", { to: selectedUser._id });
    }

    console.log("📴 Call ended");
  },
}));
