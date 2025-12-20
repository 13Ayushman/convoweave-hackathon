import { useCallback, useState } from "react";

export function useWebRTC({ videoRef, audioRef }) {
  const [mediaStream, setMediaStream] = useState(null);

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      if (videoRef && videoRef.current) videoRef.current.srcObject = stream;
      if (audioRef && audioRef.current) audioRef.current.srcObject = stream;
      return true;
    } catch (err) {
      console.error("Media access error:", err);
      if (err.name === 'NotAllowedError') {
        alert("Camera/microphone permission denied. Please allow access and try again.");
      } else if (err.name === 'NotFoundError') {
        alert("No camera/microphone found. Please connect a device.");
      } else {
        alert("Could not access camera/mic. Please check device permissions and availability.");
      }
      return false;
    }
  }, [videoRef, audioRef]);

  const stopMedia = useCallback(() => {
    mediaStream?.getTracks().forEach((t) => t.stop());
    setMediaStream(null);
    if (videoRef && videoRef.current) videoRef.current.srcObject = null;
    if (audioRef && audioRef.current) audioRef.current.srcObject = null;
  }, [mediaStream, videoRef, audioRef]);

  return { mediaStream, startMedia, stopMedia };
}
