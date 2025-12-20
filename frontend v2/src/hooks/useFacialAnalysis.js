import { useCallback, useEffect, useRef, useState } from "react";

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559343";

export function useFacialAnalysis({ videoRef, isEnabled = false }) {
  const [faceMesh, setFaceMesh] = useState(null);
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Load MediaPipe
  useEffect(() => {
    async function loadMediaPipe() {
      if (!isEnabled) return;
      const script = document.createElement("script");
      script.src = `${MEDIAPIPE_CDN}/face_mesh.js`;
      script.onload = async () => {
        const FaceMesh = window.FaceMesh;
        const mesh = new FaceMesh({
          locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
        });
        mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        mesh.onResults((results) => {
          if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              const landmarks = results.multiFaceLandmarks[0];
              landmarks.forEach((pt) => {
                ctx.fillStyle = "#22c55e";
                ctx.fillRect(pt.x * canvasRef.current.width - 2, pt.y * canvasRef.current.height - 2, 4, 4);
              });
            }
          }
        });
        setFaceMesh(mesh);
        setIsReady(true);
      };
      document.head.appendChild(script);
    }
    loadMediaPipe();
  }, [isEnabled, videoRef]);

  const analyzeFrame = useCallback(() => {
    if (!faceMesh || !videoRef.current || !canvasRef.current) return null;
    try {
      faceMesh.send({ image: videoRef.current });
      // Placeholder; extend with actual extraction
      return { engagement: 0.7, confusion: 0.2, stress: 0.3 };
    } catch (e) {
      console.error("MediaPipe error", e);
      return null;
    }
  }, [faceMesh, videoRef]);

  return { isReady, canvasRef, analyzeFrame };
}
