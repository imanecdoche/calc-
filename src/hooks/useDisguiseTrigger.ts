import { useEffect, useRef } from 'react';

interface UseDisguiseTriggerProps {
  isActive: boolean;
  onTrigger: () => void;
}

export function useDisguiseTrigger({ isActive, onTrigger }: UseDisguiseTriggerProps) {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!isActive) return;

    // --- 1. Lock/Sleep/Tab Switch Detection (Visibility API) ---
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[DisguiseTrigger] Tab hidden / phone locked. Redirecting to Wiki disguise.');
        onTriggerRef.current();
      }
    };

    const handlePageHide = () => {
      console.log('[DisguiseTrigger] Page hide event. Redirecting to Wiki disguise.');
      onTriggerRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // --- 2. Shake / Guncangan Detection (DeviceMotion API) ---
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 900; // Sensitivity parameter

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity || event.acceleration;
      if (!acceleration) return;

      const curTime = Date.now();
      // Sample every 80ms to avoid noisy triggers
      if (curTime - lastUpdate > 80) {
        const diffTime = curTime - lastUpdate;
        lastUpdate = curTime;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        // Calculate change in vector forces over time delta
        const deltaForce = Math.abs(x + y + z - lastX - lastY - lastZ);
        const speed = (deltaForce / diffTime) * 10000;

        if (speed > SHAKE_THRESHOLD) {
          console.log(`[DisguiseTrigger] Shake detected (force: ${speed.toFixed(0)}). Redirecting to Wiki disguise.`);
          onTriggerRef.current();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    // Request accelerometer permission on modern iOS Safari if needed
    const requestDeviceMotionPermission = async () => {
      const DeviceMotionEventClass = (window as any).DeviceMotionEvent;
      if (
        DeviceMotionEventClass &&
        typeof DeviceMotionEventClass.requestPermission === 'function'
      ) {
        try {
          const permissionState = await DeviceMotionEventClass.requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
          }
        } catch (error) {
          console.warn('[DisguiseTrigger] iOS DeviceMotion permission request error:', error);
        }
      } else {
        // Android / desktop default
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
    };

    requestDeviceMotionPermission();

    // Fallback/Test helper: keyboard shortcut (e.g., Press 'Alt + L' or 'Escape' to simulate shake/lock)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        console.log('[DisguiseTrigger] Simulator key combo (Alt+L) pressed.');
        onTriggerRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [isActive]);
}
