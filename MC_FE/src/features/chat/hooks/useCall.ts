import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Call,
  IceCandidatePayload,
  WebRtcDescription,
} from "../types/chatTypes";

import {
  startCallHub,
} from "../services/callHub";

export function useCall() {
  const [
    call,
    setCall,
  ] = useState<Call | null>(
    null
  );

  const [
    incoming,
    setIncoming,
  ] = useState<Call | null>(
    null
  );

  const [
    calling,
    setCalling,
  ] = useState(false);

  const [
    connected,
    setConnected,
  ] = useState(false);

  const [
    muted,
    setMuted,
  ] = useState(false);

  const [
    cameraEnabled,
    setCameraEnabled,
  ] = useState(true);

  const localVideoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const remoteMediaRef =
    useRef<HTMLMediaElement>(
      null
    );

  const peerRef =
    useRef<RTCPeerConnection | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const remoteStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const callRef =
    useRef<Call | null>(
      null
    );

  const callerRef =
    useRef(false);

  const pendingIceRef =
    useRef<
      IceCandidatePayload[]
    >([]);

  const cleanup =
    useCallback(() => {
      peerRef.current
        ?.close();

      peerRef.current =
        null;

      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      streamRef.current =
        null;

      remoteStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      remoteStreamRef.current =
        null;

      if (
        localVideoRef.current
      ) {
        localVideoRef.current
          .srcObject = null;
      }

      if (
        remoteMediaRef.current
      ) {
        remoteMediaRef.current
          .srcObject = null;
      }

      pendingIceRef.current =
        [];

      callRef.current = null;
      callerRef.current =
        false;

      setCall(null);
      setIncoming(null);
      setCalling(false);
      setConnected(false);
      setMuted(false);
      setCameraEnabled(
        true
      );
    }, []);

  const attachRemoteStream =
    useCallback(
      (
        stream: MediaStream
      ) => {
        remoteStreamRef.current =
          stream;

        const element =
          remoteMediaRef.current;

        if (!element) {
          return;
        }

        element.srcObject =
          stream;

        void element
          .play()
          .catch(() => {});
      },
      []
    );

  const flushIce =
    useCallback(async () => {
      const peer =
        peerRef.current;

      if (
        !peer
          ?.remoteDescription
      ) {
        return;
      }

      while (
        pendingIceRef
          .current.length >
        0
      ) {
        const candidate =
          pendingIceRef.current
            .shift();

        if (!candidate) {
          continue;
        }

        try {
          await peer
            .addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
        } catch (error) {
          console.error(
            "Add queued ICE error:",
            error
          );
        }
      }
    }, []);

  const createPeer =
    useCallback(
      async (
        activeCall: Call
      ) => {
        if (
          peerRef.current
        ) {
          return peerRef.current;
        }

        const peer =
          new RTCPeerConnection(
            {
              iceServers: [
                {
                  urls:
                    "stun:stun.l.google.com:19302",
                },
                {
                  urls:
                    "stun:stun1.l.google.com:19302",
                },
              ],
            }
          );

        const remoteStream =
          new MediaStream();

        remoteStreamRef.current =
          remoteStream;

        peer.ontrack = (
          event
        ) => {
          if (
            event.streams[0]
          ) {
            attachRemoteStream(
              event.streams[0]
            );

            return;
          }

          remoteStream.addTrack(
            event.track
          );

          attachRemoteStream(
            remoteStream
          );
        };

        peer.onicecandidate =
          (event) => {
            const current =
              callRef.current;

            if (
              !event.candidate ||
              !current
            ) {
              return;
            }

            void (async () => {
              try {
                const hub =
                  await startCallHub();

                await hub.invoke(
                  "SendIceCandidate",
                  current.callId,
                  {
                    candidate:
                      event
                        .candidate!
                        .candidate,

                    sdpMid:
                      event
                        .candidate!
                        .sdpMid,

                    sdpMLineIndex:
                      event
                        .candidate!
                        .sdpMLineIndex,
                  }
                );
              } catch (
                error
              ) {
                console.error(
                  "Send ICE error:",
                  error
                );
              }
            })();
          };

        peer.onconnectionstatechange =
          () => {
            const state =
              peer.connectionState;

            setConnected(
              state ===
                "connected"
            );

            if (
              state ===
                "failed" ||
              state ===
                "closed"
            ) {
              cleanup();
            }
          };

        const video =
          activeCall.callType
            .toUpperCase() ===
          "VIDEO";

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio: true,
              video,
            });

        streamRef.current =
          stream;

        stream
          .getTracks()
          .forEach(
            (track) => {
              peer.addTrack(
                track,
                stream
              );
            }
          );

        peerRef.current =
          peer;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current
            .srcObject =
            stream;

          localVideoRef.current
            .muted = true;

          void localVideoRef
            .current
            .play()
            .catch(() => {});
        }

        setMuted(false);

        setCameraEnabled(
          video
        );

        return peer;
      },
      [
        attachRemoteStream,
        cleanup,
      ]
    );

  useEffect(() => {
    let disposed = false;

    let hub:
      Awaited<
        ReturnType<
          typeof startCallHub
        >
      > | null = null;

    const initialize =
      async () => {
        try {
          hub =
            await startCallHub();

          if (disposed) {
            return;
          }

          const events = [
            "IncomingCall",
            "CallStarted",
            "CallAccepted",
            "CallRejected",
            "CallEnded",
            "ReceiveOffer",
            "ReceiveAnswer",
            "ReceiveIceCandidate",
          ];

          events.forEach(
            (event) =>
              hub?.off(event)
          );

          hub.on(
            "IncomingCall",
            (data: Call) => {
              callerRef.current =
                false;

              callRef.current =
                data;

              setIncoming(
                data
              );

              setCall(null);

              setCalling(
                false
              );
            }
          );

          hub.on(
            "CallStarted",
            (data: Call) => {
              callerRef.current =
                true;

              callRef.current =
                data;

              setCall(data);

              setIncoming(
                null
              );

              setCalling(
                true
              );
            }
          );

          hub.on(
            "CallAccepted",
            async (
              data: Call
            ) => {
              if (
                callRef.current &&
                callRef.current
                  .callId !==
                  data.callId
              ) {
                return;
              }

              callRef.current =
                data;

              setCall(data);
              setIncoming(null);
              setCalling(false);

              if (
                !callerRef.current
              ) {
                return;
              }

              try {
                const peer =
                  await createPeer(
                    data
                  );

                const offer =
                  await peer
                    .createOffer();

                await peer
                  .setLocalDescription(
                    offer
                  );

                if (
                  !offer.sdp
                ) {
                  throw new Error(
                    "Không tạo được SDP offer."
                  );
                }

                await hub!
                  .invoke(
                    "SendOffer",
                    data.callId,
                    {
                      type:
                        "offer",
                      sdp:
                        offer.sdp,
                    }
                  );
              } catch (
                error
              ) {
                console.error(
                  "Create offer error:",
                  error
                );

                cleanup();
              }
            }
          );

          hub.on(
            "ReceiveOffer",
            async (
              payload: {
                callId: number;
                fromUserId: number;
                offer:
                  WebRtcDescription;
              }
            ) => {
              const current =
                callRef.current;

              if (
                !current ||
                current.callId !==
                  payload.callId
              ) {
                return;
              }

              try {
                const peer =
                  await createPeer(
                    current
                  );

                await peer
                  .setRemoteDescription(
                    new RTCSessionDescription(
                      {
                        type:
                          "offer",
                        sdp:
                          payload
                            .offer
                            .sdp,
                      }
                    )
                  );

                await flushIce();

                const answer =
                  await peer
                    .createAnswer();

                await peer
                  .setLocalDescription(
                    answer
                  );

                if (
                  !answer.sdp
                ) {
                  throw new Error(
                    "Không tạo được SDP answer."
                  );
                }

                await hub!
                  .invoke(
                    "SendAnswer",
                    payload.callId,
                    {
                      type:
                        "answer",
                      sdp:
                        answer.sdp,
                    }
                  );
              } catch (
                error
              ) {
                console.error(
                  "Receive offer error:",
                  error
                );

                cleanup();
              }
            }
          );

          hub.on(
            "ReceiveAnswer",
            async (
              payload: {
                callId: number;
                fromUserId: number;
                answer:
                  WebRtcDescription;
              }
            ) => {
              const current =
                callRef.current;

              const peer =
                peerRef.current;

              if (
                !current ||
                current.callId !==
                  payload.callId ||
                !peer
              ) {
                return;
              }

              try {
                await peer
                  .setRemoteDescription(
                    new RTCSessionDescription(
                      {
                        type:
                          "answer",
                        sdp:
                          payload
                            .answer
                            .sdp,
                      }
                    )
                  );

                await flushIce();
              } catch (
                error
              ) {
                console.error(
                  "Receive answer error:",
                  error
                );

                cleanup();
              }
            }
          );

          hub.on(
            "ReceiveIceCandidate",
            async (
              payload: {
                callId: number;
                fromUserId: number;
                candidate:
                  IceCandidatePayload;
              }
            ) => {
              const current =
                callRef.current;

              if (
                !current ||
                current.callId !==
                  payload.callId
              ) {
                return;
              }

              const peer =
                peerRef.current;

              if (
                !peer ||
                !peer
                  .remoteDescription
              ) {
                pendingIceRef
                  .current
                  .push(
                    payload.candidate
                  );

                return;
              }

              try {
                await peer
                  .addIceCandidate(
                    new RTCIceCandidate(
                      payload.candidate
                    )
                  );
              } catch (
                error
              ) {
                console.error(
                  "ICE candidate error:",
                  error
                );
              }
            }
          );

          hub.on(
            "CallRejected",
            (data: Call) => {
              if (
                !callRef.current ||
                callRef.current
                  .callId ===
                  data.callId
              ) {
                cleanup();
              }
            }
          );

          hub.on(
            "CallEnded",
            (data: Call) => {
              if (
                !callRef.current ||
                callRef.current
                  .callId ===
                  data.callId
              ) {
                cleanup();
              }
            }
          );
        } catch (error) {
          console.error(
            "Call hub initialize error:",
            error
          );
        }
      };

    void initialize();

    return () => {
      disposed = true;

      if (hub) {
        hub.off(
          "IncomingCall"
        );

        hub.off(
          "CallStarted"
        );

        hub.off(
          "CallAccepted"
        );

        hub.off(
          "CallRejected"
        );

        hub.off(
          "CallEnded"
        );

        hub.off(
          "ReceiveOffer"
        );

        hub.off(
          "ReceiveAnswer"
        );

        hub.off(
          "ReceiveIceCandidate"
        );
      }

      cleanup();
    };
  }, [
    cleanup,
    createPeer,
    flushIce,
  ]);

  const startCall =
    useCallback(
      async (
        conversationId: number,
        type:
          | "VOICE"
          | "VIDEO"
      ) => {
        if (
          callRef.current ||
          incoming
        ) {
          return;
        }

        callerRef.current =
          true;

        setCalling(true);

        try {
          const hub =
            await startCallHub();

          await hub.invoke(
            "StartCall",
            conversationId,
            type
          );
        } catch (error) {
          callerRef.current =
            false;

          setCalling(false);

          console.error(
            "Start call error:",
            error
          );

          throw error;
        }
      },
      [incoming]
    );

  const accept =
    useCallback(async () => {
      if (!incoming) return;

      const selected =
        incoming;

      try {
        callerRef.current =
          false;

        callRef.current =
          selected;

        await createPeer(
          selected
        );

        setCall(selected);
        setIncoming(null);
        setCalling(false);

        const hub =
          await startCallHub();

        await hub.invoke(
          "AcceptCall",
          selected.callId
        );
      } catch (error) {
        console.error(
          "Accept call error:",
          error
        );

        cleanup();
      }
    }, [
      cleanup,
      createPeer,
      incoming,
    ]);

  const reject =
    useCallback(async () => {
      if (!incoming) return;

      try {
        const hub =
          await startCallHub();

        await hub.invoke(
          "RejectCall",
          incoming.callId
        );
      } catch (error) {
        console.error(
          "Reject call error:",
          error
        );
      } finally {
        cleanup();
      }
    }, [
      cleanup,
      incoming,
    ]);

  const end =
    useCallback(async () => {
      const current =
        callRef.current ??
        incoming;

      try {
        if (current) {
          const hub =
            await startCallHub();

          await hub.invoke(
            "EndCall",
            current.callId
          );
        }
      } catch (error) {
        console.error(
          "End call error:",
          error
        );
      } finally {
        cleanup();
      }
    }, [
      cleanup,
      incoming,
    ]);

  const toggleMute =
    useCallback(() => {
      const track =
        streamRef.current
          ?.getAudioTracks()[0];

      if (!track) return;

      track.enabled =
        !track.enabled;

      setMuted(
        !track.enabled
      );
    }, []);

  const toggleCamera =
    useCallback(() => {
      const track =
        streamRef.current
          ?.getVideoTracks()[0];

      if (!track) return;

      track.enabled =
        !track.enabled;

      setCameraEnabled(
        track.enabled
      );
    }, []);

  return {
    call,
    incoming,
    calling,
    connected,
    muted,
    cameraEnabled,
    localVideoRef,
    remoteMediaRef,
    startCall,
    accept,
    reject,
    end,
    toggleMute,
    toggleCamera,
  };
}