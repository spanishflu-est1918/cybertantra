import { useState, useCallback, useEffect } from 'react';

export function usePermissions() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check existing permissions on mount
  useEffect(() => {
    const checkExistingPermissions = async () => {
      if (typeof navigator === 'undefined' || !navigator.permissions) {
        setIsChecking(false);
        return;
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('[Permissions] Current status:', permissionStatus.state);
        
        if (permissionStatus.state === 'granted') {
          setPermissionsGranted(true);
          setIsFirstInteraction(false);
          console.log('[Permissions] Already granted');
        } else if (permissionStatus.state === 'denied') {
          setPermissionsGranted(false);
          setIsFirstInteraction(false);
          setPermissionError('Microphone access was previously denied. Please reset permissions in your browser.');
        } else {
          // 'prompt' state - first time
          setPermissionsGranted(false);
          setIsFirstInteraction(true);
        }
      } catch (error) {
        console.log('[Permissions] Could not check existing permissions, will prompt user');
      }
      
      setIsChecking(false);
    };

    checkExistingPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    console.log('Requesting microphone permissions...');
    setPermissionError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionsGranted(true);
      setIsFirstInteraction(false);
      
      return true;
    } catch (error) {
      console.error('Microphone access denied:', error);
      setPermissionsGranted(false);
      setIsFirstInteraction(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('No microphone found. Please connect a microphone and try again.');
        } else {
          setPermissionError(`Microphone error: ${error.message}`);
        }
      } else {
        setPermissionError('Unknown error occurred while accessing microphone.');
      }
      
      return false;
    }
  }, []);

  const resetPermissions = useCallback(() => {
    setPermissionsGranted(false);
    setIsFirstInteraction(true);
    setPermissionError(null);
  }, []);

  return {
    permissionsGranted,
    isFirstInteraction,
    permissionError,
    isChecking,
    requestPermissions,
    resetPermissions,
    isSupported: typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  };
}