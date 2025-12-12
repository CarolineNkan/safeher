"use client";

import { useState, useEffect, useRef } from "react";
import { networkManager, resilientFetchJson, SOS_RETRY_OPTIONS, LOCATION_UPDATE_RETRY_OPTIONS } from "@/utils/network-resilience";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

type SOSState = "idle" | "countdown" | "activated";

export default function SOSPage() {
  const [sosState, setSosState] = useState<SOSState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [lastKnownLocation, setLastKnownLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [gpsSignalStrength, setGpsSignalStrength] = useState<'strong' | 'weak' | 'none'>('none');
  const [sosId, setSosId] = useState<string | null>(null);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [isLocationUpdating, setIsLocationUpdating] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [queuedUpdates, setQueuedUpdates] = useState<Array<{sosId: string, location: UserLocation}>>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);

  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const locationInterval = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Check location permissions and get location on component mount
  useEffect(() => {
    checkLocationPermission();
    getCurrentLocation();
    
    // Load alarm preference from localStorage
    const savedAlarmPreference = localStorage.getItem('safeher-alarm-enabled');
    if (savedAlarmPreference !== null && savedAlarmPreference !== 'undefined') {
      try {
        setAlarmEnabled(JSON.parse(savedAlarmPreference));
      } catch (error) {
        console.warn('Failed to parse alarm preference from localStorage:', error);
        // Reset to default value
        localStorage.setItem('safeher-alarm-enabled', 'false');
        setAlarmEnabled(false);
      }
    }
    
    // Monitor network status using the network manager
    const handleNetworkStatusChange = (status: any) => {
      const wasOffline = networkStatus === 'offline';
      setNetworkStatus(status.isOnline ? 'online' : 'offline');
      
      if (status.isOnline && wasOffline) {
        console.log('🌐 Network reconnected - processing queued operations');
        
        // Process queued updates when back online
        processQueuedUpdates();
        
        // Clear any network-related error messages
        if (errorMessage?.includes('network') || errorMessage?.includes('offline') || errorMessage?.includes('connection')) {
          setErrorMessage(null);
          setErrorDetails(null);
        }
        
        // Show brief reconnection feedback
        if (sosState === 'activated') {
          setLocationError('🌐 Connection restored - syncing location updates');
          setTimeout(() => {
            if (locationError === '🌐 Connection restored - syncing location updates') {
              setLocationError(null);
            }
          }, 3000);
        }
      } else if (!status.isOnline) {
        console.log('🌐 Network disconnected - operations will be queued');
        
        // Show offline notification for active SOS
        if (sosState === 'activated') {
          setLocationError('📶 Connection lost - location updates will be queued and sent when reconnected');
        }
      }
    };
    
    networkManager.addNetworkStatusListener(handleNetworkStatusChange);
    
    // Set initial network status
    const initialStatus = networkManager.getNetworkStatus();
    setNetworkStatus(initialStatus.isOnline ? 'online' : 'offline');
    
    return () => {
      networkManager.removeNetworkStatusListener(handleNetworkStatusChange);
    };
  }, []);

  // Save alarm preference when it changes
  useEffect(() => {
    localStorage.setItem('safeher-alarm-enabled', JSON.stringify(alarmEnabled));
  }, [alarmEnabled]);

  // Cleanup intervals and audio on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      stopAlarm();
    };
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.permissions) {
      setLocationPermission('unknown');
      // For browsers without permissions API, try to detect through geolocation
      if (navigator.geolocation) {
        // Test with a quick, low-impact position request
        navigator.geolocation.getCurrentPosition(
          () => setLocationPermission('granted'),
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermission('denied');
            } else {
              setLocationPermission('prompt');
            }
          },
          { timeout: 1000, maximumAge: 300000 }
        );
      }
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
      
      // Listen for permission changes
      permission.addEventListener('change', () => {
        const newState = permission.state as 'granted' | 'denied' | 'prompt';
        setLocationPermission(newState);
        
        // React to permission changes
        if (newState === 'granted') {
          setLocationError(null);
          getCurrentLocation(true, true);
        } else if (newState === 'denied') {
          setLocationError("Location access denied. SOS functionality requires location permissions.");
          setGpsSignalStrength('none');
        }
      });
    } catch (error) {
      console.error('Permission check error:', error);
      setLocationPermission('unknown');
    }
  };

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by this browser");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      setLocationError("Requesting location permission...");
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          setLocationError(null);
          
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };
          
          setUserLocation(location);
          setLastKnownLocation(location);
          localStorage.setItem('safeher-last-location', JSON.stringify(location));
          
          if (position.coords.accuracy <= 5) {
            setGpsSignalStrength('strong');
          } else if (position.coords.accuracy <= 20) {
            setGpsSignalStrength('weak');
          } else {
            setGpsSignalStrength('none');
          }
          
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission('denied');
            setLocationError("Location permission denied. Please enable location access in browser settings.");
          } else {
            setLocationError("Failed to get location. Please try again.");
          }
          setGpsSignalStrength('none');
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const getCurrentLocation = (useHighAccuracy = true, showUserFeedback = true) => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser. Please use a modern browser with location services.";
      setLocationError(errorMsg);
      setGpsSignalStrength('none');
      
      // Try to use cached location from localStorage as fallback
      const cachedLocation = localStorage.getItem('safeher-last-location');
      if (cachedLocation) {
        try {
          const parsed = JSON.parse(cachedLocation);
          setLastKnownLocation(parsed);
          setUserLocation(parsed);
          if (showUserFeedback) {
            setLocationError("Using cached location. GPS not available.");
          }
        } catch (e) {
          console.error("Failed to parse cached location:", e);
        }
      }
      return;
    }

    const options = {
      enableHighAccuracy: useHighAccuracy,
      timeout: useHighAccuracy ? 15000 : 8000, // Increased timeouts for better reliability
      maximumAge: useHighAccuracy ? 30000 : 120000, // More aggressive caching for fallback
    };

    if (showUserFeedback) {
      setLocationError("Getting your location...");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        
        setUserLocation(location);
        setLastKnownLocation(location);
        setLocationError(null);
        
        // Cache location in localStorage for future fallback
        localStorage.setItem('safeher-last-location', JSON.stringify(location));
        
        // Enhanced GPS signal strength detection
        if (position.coords.accuracy <= 5) {
          setGpsSignalStrength('strong');
        } else if (position.coords.accuracy <= 20) {
          setGpsSignalStrength('weak');
        } else {
          setGpsSignalStrength('none');
        }
        
        console.log("📍 Location obtained:", location, `Accuracy: ${position.coords.accuracy}m, Signal: ${position.coords.accuracy <= 5 ? 'strong' : position.coords.accuracy <= 20 ? 'weak' : 'poor'}`);
      },
      (error) => {
        console.error("Location error:", error);
        
        // Enhanced error handling with better user feedback
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. SOS requires location permissions to function properly.");
            setLocationPermission('denied');
            setGpsSignalStrength('none');
            
            // Show instructions for enabling permissions
            if (showUserFeedback) {
              setTimeout(() => {
                setLocationError("To enable location: Go to browser settings → Site permissions → Location → Allow");
              }, 3000);
            }
            break;
            
          case error.POSITION_UNAVAILABLE:
            setLocationError("GPS signal unavailable. Trying fallback methods...");
            setGpsSignalStrength('none');
            
            // Try multiple fallback strategies
            handleLocationFallback(useHighAccuracy, showUserFeedback);
            break;
            
          case error.TIMEOUT:
            if (useHighAccuracy) {
              setLocationError("High-accuracy GPS timed out. Trying standard accuracy...");
              setTimeout(() => getCurrentLocation(false, showUserFeedback), 1000);
            } else {
              setLocationError("Location request timed out. Using fallback...");
              handleLocationFallback(false, showUserFeedback);
            }
            break;
            
          default:
            setLocationError("Location service error. Using fallback methods...");
            handleLocationFallback(useHighAccuracy, showUserFeedback);
            break;
        }
      },
      options
    );
  };

  const handleLocationFallback = (useHighAccuracy: boolean, showUserFeedback: boolean) => {
    // Strategy 1: Use last known location from state
    if (lastKnownLocation) {
      setUserLocation(lastKnownLocation);
      setGpsSignalStrength('weak');
      if (showUserFeedback) {
        const age = Date.now() - (lastKnownLocation.timestamp || 0);
        const ageMinutes = Math.floor(age / 60000);
        setLocationError(`Using last known location (${ageMinutes} minutes old). GPS signal weak.`);
      }
      return;
    }
    
    // Strategy 2: Try cached location from localStorage
    const cachedLocation = localStorage.getItem('safeher-last-location');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        const age = Date.now() - (parsed.timestamp || 0);
        const ageHours = Math.floor(age / 3600000);
        
        // Only use cached location if it's less than 24 hours old
        if (ageHours < 24) {
          setLastKnownLocation(parsed);
          setUserLocation(parsed);
          setGpsSignalStrength('weak');
          if (showUserFeedback) {
            setLocationError(`Using cached location (${ageHours}h old). GPS signal unavailable.`);
          }
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached location:", e);
      }
    }
    
    // Strategy 3: Try one more time with very permissive settings
    if (useHighAccuracy) {
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
            };
            setUserLocation(location);
            setLastKnownLocation(location);
            setGpsSignalStrength('weak');
            localStorage.setItem('safeher-last-location', JSON.stringify(location));
            if (showUserFeedback) {
              setLocationError(`Location found with low accuracy (±${Math.round(position.coords.accuracy)}m)`);
            }
          },
          () => {
            // Final fallback failed
            setGpsSignalStrength('none');
            if (showUserFeedback) {
              setLocationError("Unable to determine location. Please check GPS settings and try again.");
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 600000, // Accept 10-minute old location
          }
        );
      }, 2000);
    } else {
      // All fallback strategies failed
      setGpsSignalStrength('none');
      if (showUserFeedback) {
        setLocationError("Location services unavailable. Please enable GPS and refresh the page.");
      }
    }
  };

  const startCountdown = async () => {
    // If location permission is denied, try to request it
    if (locationPermission === 'denied') {
      setLocationError("SOS requires location access. Please enable location permissions in your browser settings.");
      return;
    }

    // If location permission is prompt, request it first
    if (locationPermission === 'prompt' || locationPermission === 'unknown') {
      const granted = await requestLocationPermission();
      if (!granted) {
        return; // Permission request failed, error already set
      }
    }

    // Check if we have current location or can use fallback
    if (!userLocation && !lastKnownLocation) {
      setLocationError("Getting location for SOS...");
      getCurrentLocation(true, true);
      
      // Wait a moment for location, then proceed if we have fallback
      setTimeout(() => {
        if (!userLocation && !lastKnownLocation) {
          // Try to get cached location as last resort
          const cachedLocation = localStorage.getItem('safeher-last-location');
          if (cachedLocation) {
            try {
              const parsed = JSON.parse(cachedLocation);
              const age = Date.now() - (parsed.timestamp || 0);
              const ageHours = Math.floor(age / 3600000);
              
              if (ageHours < 24) {
                setLastKnownLocation(parsed);
                setUserLocation(parsed);
                setLocationError(`Using cached location (${ageHours}h old) for SOS`);
                proceedWithCountdown();
                return;
              }
            } catch (e) {
              console.error("Failed to parse cached location:", e);
            }
          }
          
          setLocationError("Unable to determine location. SOS may not work properly without location data.");
          // Still allow SOS activation but warn user
          setTimeout(() => {
            if (confirm("Location unavailable. Activate SOS anyway? (Emergency contacts will be notified but without location)")) {
              proceedWithCountdown();
            }
          }, 1000);
        } else {
          proceedWithCountdown();
        }
      }, 2000);
      return;
    }

    proceedWithCountdown();
  };

  const proceedWithCountdown = () => {
    // Provide immediate visual feedback
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 200);

    setSosState("countdown");
    setSecondsLeft(5);
    setCancelConfirmation(false);
    setLocationError(null); // Clear any location errors during countdown

    countdownInterval.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    
    // Show cancel confirmation feedback
    setCancelConfirmation(true);
    
    // Reset state after showing confirmation
    setTimeout(() => {
      setSosState("idle");
      setSecondsLeft(5);
      setCancelConfirmation(false);
    }, 1500);
  };

  const triggerSOS = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }

    setSosState("activated");
    setErrorMessage(null);
    setErrorDetails(null);

    // Use current location or fallback to last known location
    const locationToUse = userLocation || lastKnownLocation;
    if (!locationToUse) {
      console.error("No location available for SOS");
      setLocationError("Cannot activate SOS without location data");
      setSosState("idle");
      return;
    }

    try {
      console.log("🚨 Triggering SOS...");
      
      const data = await resilientFetchJson("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: locationToUse.lat,
          lng: locationToUse.lng,
        }),
      }, SOS_RETRY_OPTIONS);

      if (data.success) {
        setSosId(data.sos_id);
        console.log("✅ SOS activated:", data.sos_id);
        
        // Clear any previous errors
        setLocationError(null);
        
        // Show any notification warnings
        if (data.notification_errors && data.notification_errors.length > 0) {
          setLocationError(`SOS activated but some contacts couldn't be notified: ${data.notification_errors.join(', ')}`);
        }
        
        // Start alarm if enabled
        if (alarmEnabled) {
          startAlarm();
        }

        // Start location updates every 5 seconds
        startLocationUpdates(data.sos_id);
      } else {
        console.error("SOS trigger failed:", data.message);
        setErrorMessage(data.message);
        setErrorDetails(data.error_details);
        setSosState("idle");
      }
    } catch (error: any) {
      console.error("SOS trigger error:", error);
      
      // Handle different types of errors with enhanced user-friendly messages
      let userMessage = "Failed to activate SOS. Please try again.";
      let errorDetails = error.error_details;
      
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        userMessage = "Network connection failed. SOS will retry automatically when connection is restored.";
        errorDetails = {
          title: "Network Connection Error",
          actions: [
            "Check your internet connection",
            "Move to an area with better signal",
            "Try again in a few moments",
            "SOS will automatically retry when connection improves"
          ],
          severity: "warning"
        };
      } else if (error.status >= 500) {
        userMessage = "Server temporarily unavailable. The system will retry automatically.";
        errorDetails = {
          title: "Server Error",
          actions: [
            "The system will automatically retry",
            "No action needed from you",
            "If problem persists, contact support"
          ],
          severity: "warning"
        };
      } else if (error.status === 400) {
        userMessage = error.message || "Invalid request. Please check your location settings.";
      } else if (error.status === 408 || error.message?.includes('timeout')) {
        userMessage = "Request timed out. The system will retry with better settings.";
        errorDetails = {
          title: "Connection Timeout",
          actions: [
            "Check your internet connection speed",
            "Move to an area with better signal",
            "The system will automatically retry"
          ],
          severity: "warning"
        };
      }
      
      setErrorMessage(userMessage);
      setErrorDetails(errorDetails);
      setSosState("idle");
    }
  };

  const cancelSOS = async () => {
    if (!sosId) return;

    try {
      console.log("🛑 Cancelling SOS...");
      
      const data = await resilientFetchJson("/api/sos/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sos_id: sosId }),
      }, SOS_RETRY_OPTIONS);

      if (data.success) {
        console.log("✅ SOS cancelled");
        setErrorMessage(null);
        setErrorDetails(null);
        
        // Show any notification warnings
        if (data.notification_errors && data.notification_errors.length > 0) {
          setLocationError(`SOS cancelled but some contacts couldn't be notified: ${data.notification_errors.join(', ')}`);
        }
        
        stopSOS();
      } else {
        console.error("SOS cancel failed:", data.message);
        setErrorMessage(data.message);
        setErrorDetails(data.error_details);
      }
    } catch (error: any) {
      console.error("SOS cancel error:", error);
      
      // Handle different types of errors with enhanced feedback
      let userMessage = "Failed to cancel SOS. Please try again.";
      let errorDetails = error.error_details;
      
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        userMessage = "Network error during cancellation. Will retry automatically.";
        errorDetails = {
          title: "Network Error During Cancellation",
          actions: [
            "Check your internet connection",
            "The system will retry cancellation automatically",
            "Your emergency contacts will be notified when connection is restored"
          ],
          severity: "warning"
        };
      } else if (error.status >= 500) {
        userMessage = "Server error during cancellation. The system will retry automatically.";
        errorDetails = {
          title: "Server Error",
          actions: [
            "The cancellation will be retried automatically",
            "Your emergency contacts will be notified",
            "No further action needed"
          ],
          severity: "warning"
        };
      } else if (error.status === 408 || error.message?.includes('timeout')) {
        userMessage = "Cancellation request timed out. Will retry automatically.";
        errorDetails = {
          title: "Cancellation Timeout",
          actions: [
            "The system will retry cancellation",
            "Check your internet connection",
            "Emergency contacts will be notified when successful"
          ],
          severity: "warning"
        };
      }
      
      setErrorMessage(userMessage);
      setErrorDetails(errorDetails);
    }
  };

  const stopSOS = () => {
    setSosState("idle");
    setSosId(null);
    setIsLocationUpdating(false);
    
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
    
    // Stop alarm
    stopAlarm();
  };

  const startLocationUpdates = (sosEventId: string) => {
    setIsLocationUpdating(true);
    
    locationInterval.current = setInterval(() => {
      getCurrentLocationForUpdate(sosEventId);
    }, 5000);
  };

  const getCurrentLocationForUpdate = (sosEventId: string) => {
    if (!navigator.geolocation) {
      console.log("📍 Geolocation unavailable, using fallback");
      handleLocationUpdateFallback(sosEventId);
      return;
    }

    // Try high accuracy first
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        
        setUserLocation(location);
        setLastKnownLocation(location);
        localStorage.setItem('safeher-last-location', JSON.stringify(location));
        
        // Enhanced GPS signal strength detection for tracking
        if (position.coords.accuracy <= 5) {
          setGpsSignalStrength('strong');
        } else if (position.coords.accuracy <= 20) {
          setGpsSignalStrength('weak');
        } else {
          setGpsSignalStrength('none');
        }
        
        console.log(`📍 Location update: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${Math.round(position.coords.accuracy)}m)`);
        await updateLocationOnServer(sosEventId, location);
      },
      (error) => {
        console.error("High-accuracy location update failed:", error);
        
        // Try with lower accuracy as fallback
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
            };
            
            setUserLocation(location);
            setLastKnownLocation(location);
            localStorage.setItem('safeher-last-location', JSON.stringify(location));
            setGpsSignalStrength('weak');
            
            console.log(`📍 Location update (low accuracy): ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${Math.round(position.coords.accuracy)}m)`);
            await updateLocationOnServer(sosEventId, location);
          },
          (fallbackError) => {
            console.error("Low-accuracy location update also failed:", fallbackError);
            setGpsSignalStrength('none');
            handleLocationUpdateFallback(sosEventId);
          },
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 30000, // Accept 30-second old location
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleLocationUpdateFallback = (sosEventId: string) => {
    // Strategy 1: Use last known location from state
    if (lastKnownLocation) {
      const age = Date.now() - (lastKnownLocation.timestamp || 0);
      const ageMinutes = Math.floor(age / 60000);
      
      console.log(`📍 Using last known location for update (${ageMinutes} minutes old)`);
      updateLocationOnServer(sosEventId, lastKnownLocation);
      return;
    }
    
    // Strategy 2: Try cached location from localStorage
    const cachedLocation = localStorage.getItem('safeher-last-location');
    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        const age = Date.now() - (parsed.timestamp || 0);
        const ageHours = Math.floor(age / 3600000);
        
        // Use cached location if it's less than 6 hours old during emergency
        if (ageHours < 6) {
          console.log(`📍 Using cached location for update (${ageHours}h old)`);
          setLastKnownLocation(parsed);
          updateLocationOnServer(sosEventId, parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached location for update:", e);
      }
    }
    
    // Strategy 3: Log that no location is available but don't stop the SOS
    console.warn("📍 No location available for update - SOS continues without location data");
    setLocationError("GPS unavailable - emergency contacts notified with last known location");
  };

  const updateLocationOnServer = async (sosEventId: string, location: UserLocation) => {
    try {
      const data = await resilientFetchJson("/api/sos/update-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sos_id: sosEventId,
          lat: location.lat,
          lng: location.lng,
        }),
      }, LOCATION_UPDATE_RETRY_OPTIONS);
      
      if (data.success) {
        setLastUpdateTime(Date.now());
        console.log("📍 Location updated successfully");
        
        // Clear any previous location errors
        if (locationError?.includes('update')) {
          setLocationError(null);
        }
        
        // Handle queued updates notification
        if (data.queued) {
          console.log("📍 Location update queued due to database issues");
          setLocationError("Location updates are being queued due to connectivity issues");
        }
      } else {
        console.error("Location update failed:", data.message);
        setErrorMessage(data.message);
        setErrorDetails(data.error_details);
      }
      
    } catch (error: any) {
      console.error("Location update error:", error);
      
      // Queue update for offline scenarios or after max retries
      setQueuedUpdates(prev => [...prev, { sosId: sosEventId, location }]);
      
      // Handle different types of errors with enhanced feedback
      let userMessage = "Location update failed. Will retry automatically.";
      
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        userMessage = `📶 Network error - location update queued (${queuedUpdates.length + 1} pending)`;
      } else if (error.status >= 500) {
        userMessage = `🔄 Server error - location update queued for retry (${queuedUpdates.length + 1} pending)`;
      } else if (error.status === 408 || error.message?.includes('timeout')) {
        userMessage = `⏱️ Update timed out - queued for retry (${queuedUpdates.length + 1} pending)`;
      } else {
        userMessage = `⚠️ Update failed - queued for retry (${queuedUpdates.length + 1} pending)`;
      }
      
      setLocationError(userMessage);
      console.log(`📍 Location update queued due to error. Queue size: ${queuedUpdates.length + 1}`);
    }
  };

  const processQueuedUpdates = async () => {
    if (queuedUpdates.length === 0) return;
    
    console.log(`📍 Processing ${queuedUpdates.length} queued location updates`);
    
    // Process updates with enhanced error handling and retry logic
    const processedUpdates: typeof queuedUpdates = [];
    
    for (const update of queuedUpdates) {
      try {
        await updateLocationOnServer(update.sosId, update.location);
        processedUpdates.push(update);
        // Small delay between updates to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to process queued update for SOS ${update.sosId}:`, error);
        // Keep failed updates in queue for next attempt
      }
    }
    
    // Remove only successfully processed updates
    setQueuedUpdates(prev => prev.filter(update => !processedUpdates.includes(update)));
    
    if (processedUpdates.length > 0) {
      console.log(`📍 Successfully processed ${processedUpdates.length} queued updates`);
    }
    
    if (queuedUpdates.length > processedUpdates.length) {
      console.log(`📍 ${queuedUpdates.length - processedUpdates.length} updates remain queued`);
    }
  };

  const initializeAudioContext = async () => {
    if (typeof window === "undefined") return null;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.error("Web Audio API not supported in this browser");
        return null;
      }
      
      const audioContext = new AudioContextClass();
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Verify audio context is working
      if (audioContext.state === 'closed') {
        console.error("Audio context failed to initialize properly");
        return null;
      }
      
      console.log("🔊 Audio context initialized successfully");
      return audioContext;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      return null;
    }
  };

  const startAlarm = async () => {
    if (!alarmEnabled) return;
    
    try {
      // Initialize audio context if not already done
      if (!audioContextRef.current) {
        audioContextRef.current = await initializeAudioContext();
      }
      
      if (!audioContextRef.current) {
        console.error("Cannot start alarm: Audio context not available");
        // Set error state to inform user
        setLocationError("Audio alarm unavailable - browser may not support audio or permissions denied");
        return;
      }
      
      console.log("🔊 Starting emergency alarm");
      playAlarmTone();
      
      // Set up repeating alarm with more urgent pattern
      alarmIntervalRef.current = setInterval(() => {
        if (sosState === "activated" && alarmEnabled) {
          playAlarmTone();
        } else {
          stopAlarm();
        }
      }, 800); // Slightly faster interval for more urgency
      
    } catch (error) {
      console.error("Alarm start error:", error);
      setLocationError("Failed to start audio alarm - check browser audio permissions");
    }
  };

  const playAlarmTone = () => {
    if (!audioContextRef.current || !alarmEnabled) return;
    
    try {
      const audioContext = audioContextRef.current;
      
      // Verify audio context is still valid
      if (audioContext.state === 'closed') {
        console.error("Audio context is closed, cannot play alarm");
        return;
      }
      
      // Create oscillator for the alarm tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Enhanced alarm pattern - more urgent and attention-getting
      const now = audioContext.currentTime;
      const cycleTime = Date.now() % 1600; // 1.6 second cycle
      
      if (cycleTime < 400) {
        // High urgent tone
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.type = "square";
      } else if (cycleTime < 800) {
        // Low urgent tone
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.type = "square";
      } else if (cycleTime < 1200) {
        // Very high piercing tone
        oscillator.frequency.setValueAtTime(1500, now);
        oscillator.type = "sawtooth";
      } else {
        // Medium warbling tone
        oscillator.frequency.setValueAtTime(1000, now);
        oscillator.type = "triangle";
      }
      
      // Set maximum volume with slight fade in/out to prevent audio artifacts
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1.0, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(1.0, now + 0.39);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      
      // Play tone for 0.4 seconds
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      
      // Clean up oscillator reference
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
      
    } catch (error) {
      console.error("Alarm tone error:", error);
      // Try to reinitialize audio context on error
      audioContextRef.current = null;
    }
  };

  const stopAlarm = () => {
    console.log("🔇 Stopping emergency alarm");
    
    // Clear alarm interval
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    
    // Stop current oscillator if running
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (error) {
        // Oscillator might already be stopped
      }
      oscillatorRef.current = null;
    }
    
    // Close audio context to free resources and ensure complete cleanup
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        // Suspend first to stop any ongoing audio processing
        if (audioContextRef.current.state === 'running') {
          audioContextRef.current.suspend().catch(console.error);
        }
        // Then close to free all resources
        audioContextRef.current.close().catch(console.error);
      } catch (error) {
        console.error("Error during audio context cleanup:", error);
      }
      audioContextRef.current = null;
    }
    
    // Clear any location error related to audio
    if (locationError && locationError.includes('audio')) {
      setLocationError(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col relative">
      {/* Enhanced Countdown Overlay */}
      {sosState === "countdown" && !cancelConfirmation && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300"
          onClick={cancelCountdown}
        >
          <div 
            className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Countdown Circle with Progress */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#fee2e2"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#dc2626"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - (5 - secondsLeft) / 5)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl font-bold text-red-600 transition-all duration-300 ${
                  secondsLeft <= 2 ? 'animate-bounce scale-110' : 'animate-pulse'
                }`}>
                  {secondsLeft}
                </span>
              </div>
            </div>
            
            <h2 className={`text-xl font-bold text-gray-900 mb-2 transition-all duration-300 ${
              secondsLeft <= 2 ? 'text-red-600 animate-pulse' : ''
            }`}>
              🚨 SOS Activating
            </h2>
            <p className="text-gray-600 mb-6">
              Emergency alert will trigger in <strong className={secondsLeft <= 2 ? 'text-red-600' : ''}>
                {secondsLeft}
              </strong> second{secondsLeft !== 1 ? 's' : ''}
            </p>
            
            {/* Enhanced Cancel Button with Visual Feedback */}
            <button
              onClick={cancelCountdown}
              onMouseDown={(e) => e.currentTarget.classList.add('scale-95')}
              onMouseUp={(e) => e.currentTarget.classList.remove('scale-95')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('scale-95')}
              className={`w-full text-white py-4 rounded-xl font-semibold text-lg 
                         transition-all duration-200 transform shadow-lg
                         ${secondsLeft <= 2 
                           ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 animate-pulse' 
                           : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                         }
                         hover:scale-105 active:scale-95`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={secondsLeft <= 2 ? 'animate-bounce' : ''}>✋</span>
                <span>Cancel SOS</span>
              </span>
            </button>
            
            {/* Enhanced visual feedback for urgency */}
            <div className="mt-4 space-y-1">
              <div className="text-xs text-gray-500">
                Tap anywhere outside to cancel
              </div>
              {secondsLeft <= 2 && (
                <div className="text-xs text-red-600 font-semibold animate-pulse">
                  ⚠️ Activating soon! Cancel now!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Overlay */}
      {cancelConfirmation && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl animate-bounce">✅</span>
            </div>
            
            <h2 className="text-xl font-bold text-green-600 mb-2">
              SOS Cancelled
            </h2>
            <p className="text-gray-600 mb-4">
              Emergency alert has been successfully cancelled
            </p>
            
            {/* Confirmation Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                You are now back to safety mode. The SOS system is ready for use again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center py-8">
        <h1 className="text-3xl font-bold text-red-600 tracking-wide">
          SafeHER SOS
        </h1>
        <p className="text-gray-600 mt-2">
          Emergency assistance at your fingertips
        </p>
        
        {/* Status Indicator */}
        <div className="mt-4">
          {sosState === "idle" && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span>Ready</span>
            </div>
          )}
          {sosState === "activated" && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>SOS Active</span>
            </div>
          )}
        </div>
      </header>

      {/* Enhanced Location Status */}
      <div className="text-center mb-6 space-y-2">
        {userLocation && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
            <span>📍</span>
            <span>Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
            {userLocation.accuracy && (
              <span className="text-xs text-green-600">
                (±{Math.round(userLocation.accuracy)}m)
              </span>
            )}
          </div>
        )}
        
        {/* GPS Signal Strength Indicator */}
        {userLocation && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs">
            {gpsSignalStrength === 'strong' && (
              <div className="flex items-center gap-1 text-green-600">
                <span>📶</span>
                <span>Strong GPS Signal</span>
              </div>
            )}
            {gpsSignalStrength === 'weak' && (
              <div className="flex items-center gap-1 text-yellow-600">
                <span>📶</span>
                <span>Weak GPS Signal</span>
              </div>
            )}
            {gpsSignalStrength === 'none' && (
              <div className="flex items-center gap-1 text-red-600">
                <span>📶</span>
                <span>No GPS Signal</span>
              </div>
            )}
          </div>
        )}
        
        {isLocationUpdating && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">
              Updating location every 5 seconds...
            </div>
            {lastUpdateTime && (
              <div className="text-xs text-gray-400">
                Last update: {new Date(lastUpdateTime).toLocaleTimeString()}
              </div>
            )}
            {networkStatus === 'offline' && (
              <div className="text-xs text-red-500">
                📶 Offline - updates queued ({queuedUpdates.length})
              </div>
            )}
            {queuedUpdates.length > 0 && networkStatus === 'online' && (
              <div className="text-xs text-yellow-600">
                📤 Processing queued updates ({queuedUpdates.length})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Location Permission Status */}
      {locationPermission === 'denied' && (
        <div className="text-center mb-6">
          <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <span>🚫</span>
              <span className="font-semibold">Location Access Denied</span>
            </div>
            <p className="text-sm text-red-600 mb-3">
              SOS requires location permissions to notify emergency contacts of your whereabouts.
            </p>
            <div className="text-xs text-red-500 space-y-1">
              <div>To enable location access:</div>
              <div>1. Click the location icon in your browser's address bar</div>
              <div>2. Select "Allow" for location permissions</div>
              <div>3. Refresh this page</div>
            </div>
            <button
              onClick={requestLocationPermission}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
            >
              Request Permission Again
            </button>
          </div>
        </div>
      )}

      {locationPermission === 'prompt' && !userLocation && (
        <div className="text-center mb-6">
          <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <span>📍</span>
              <span className="font-semibold">Location Permission Needed</span>
            </div>
            <p className="text-sm text-blue-600 mb-3">
              Click "Allow" when prompted to enable SOS location sharing.
            </p>
            <button
              onClick={requestLocationPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Enable Location Access
            </button>
          </div>
        </div>
      )}

      {locationError && (
        <div className="text-center mb-6">
          <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <span>⚠️</span>
              <span className="font-semibold">Location Service Issue</span>
            </div>
            <p className="text-sm text-yellow-600 mb-3">{locationError}</p>
            
            {lastKnownLocation && (
              <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
                <div className="text-xs text-yellow-700">
                  <div className="font-semibold">Fallback Location Available:</div>
                  <div>Lat: {lastKnownLocation.lat.toFixed(6)}</div>
                  <div>Lng: {lastKnownLocation.lng.toFixed(6)}</div>
                  {lastKnownLocation.timestamp && (
                    <div>Age: {Math.floor((Date.now() - lastKnownLocation.timestamp) / 60000)} minutes</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => getCurrentLocation(true, true)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition"
              >
                Retry GPS
              </button>
              <button
                onClick={() => getCurrentLocation(false, true)}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition"
              >
                Try Low Accuracy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error Display */}
      {errorMessage && (
        <div className="text-center mb-6">
          <div className={`max-w-md mx-auto rounded-lg p-4 ${
            errorDetails?.severity === 'warning' 
              ? 'bg-yellow-50 border border-yellow-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex items-center gap-2 mb-2 ${
              errorDetails?.severity === 'warning' ? 'text-yellow-700' : 'text-red-700'
            }`}>
              <span>{errorDetails?.severity === 'warning' ? '⚠️' : '❌'}</span>
              <span className="font-semibold">
                {errorDetails?.title || 'Error'}
              </span>
            </div>
            <p className={`text-sm mb-3 ${
              errorDetails?.severity === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {errorMessage}
            </p>
            
            {errorDetails?.actions && errorDetails.actions.length > 0 && (
              <div className={`bg-opacity-50 rounded p-2 mb-3 text-xs ${
                errorDetails?.severity === 'warning' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <div className="font-semibold mb-1">What you can do:</div>
                <ul className="space-y-1">
                  {errorDetails.actions.map((action: string, index: number) => (
                    <li key={index}>• {action}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setErrorDetails(null);
                }}
                className={`px-3 py-1 text-white rounded text-sm transition ${
                  errorDetails?.severity === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Dismiss
              </button>
              {sosState === 'idle' && (
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setErrorDetails(null);
                    // Retry the last action
                    if (userLocation || lastKnownLocation) {
                      startCountdown();
                    } else {
                      getCurrentLocation(true, true);
                    }
                  }}
                  className={`px-3 py-1 text-white rounded text-sm transition ${
                    errorDetails?.severity === 'warning'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced SOS Button */}
      <section className="flex justify-center mt-4 mb-8">
        {sosState === "idle" ? (
          <button
            onClick={startCountdown}
            onMouseDown={(e) => {
              if ((userLocation || lastKnownLocation) && locationPermission !== 'denied') {
                e.currentTarget.classList.add('scale-90');
              }
            }}
            onMouseUp={(e) => e.currentTarget.classList.remove('scale-90')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('scale-90')}
            disabled={locationPermission === 'denied' && !userLocation && !lastKnownLocation}
            className={`w-48 h-48 rounded-full text-white text-4xl font-bold shadow-lg 
                       flex flex-col items-center justify-center transition-all duration-200
                       transform relative overflow-hidden
                       ${locationPermission !== 'denied' && (userLocation || lastKnownLocation || locationPermission === 'prompt')
                         ? `bg-red-600 hover:bg-red-700 shadow-red-300/50 hover:scale-105 hover:shadow-xl
                            ${buttonPressed ? 'scale-90 bg-red-800' : ''}` 
                         : locationPermission === 'denied'
                         ? 'bg-gray-400 cursor-not-allowed'
                         : 'bg-orange-500 hover:bg-orange-600 shadow-orange-300/50 hover:scale-105'
                       }`}
          >
            {/* Enhanced pulse animation ring */}
            {locationPermission !== 'denied' && (userLocation || lastKnownLocation || locationPermission === 'prompt') && (
              <>
                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                  userLocation ? 'bg-red-600' : 'bg-orange-500'
                }`}></div>
                <div className={`absolute inset-0 rounded-full animate-pulse opacity-30 ${
                  userLocation ? 'bg-red-500' : 'bg-orange-400'
                }`}></div>
              </>
            )}
            
            {/* Button press ripple effect */}
            {buttonPressed && (
              <div className="absolute inset-0 rounded-full bg-white opacity-30 animate-ping"></div>
            )}
            
            <span className={`relative z-10 transition-all duration-200 ${
              buttonPressed ? 'scale-110' : ''
            }`}>🚨</span>
            <span className={`relative z-10 text-2xl transition-all duration-200 ${
              buttonPressed ? 'scale-110' : ''
            }`}>SOS</span>
            
            {!userLocation && !lastKnownLocation && locationPermission !== 'prompt' && (
              <span className="absolute bottom-4 text-xs text-gray-300">
                {locationPermission === 'denied' ? 'Location required' : 'Getting location...'}
              </span>
            )}
            {locationPermission === 'prompt' && (
              <span className="absolute bottom-4 text-xs text-gray-300">
                Tap to enable location
              </span>
            )}
            {locationPermission === 'denied' && (
              <span className="absolute bottom-4 text-xs text-gray-300">
                Location access needed
              </span>
            )}
            
            {/* Enhanced ready indicator */}
            {userLocation && locationPermission === 'granted' && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
            )}
            {lastKnownLocation && !userLocation && locationPermission === 'granted' && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-xs">⚠</span>
              </div>
            )}
            {locationPermission === 'prompt' && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs">?</span>
              </div>
            )}
          </button>
        ) : sosState === "activated" ? (
          <button
            onClick={cancelSOS}
            onMouseDown={(e) => e.currentTarget.classList.add('scale-90')}
            onMouseUp={(e) => e.currentTarget.classList.remove('scale-90')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('scale-90')}
            className="w-48 h-48 rounded-full bg-gray-600 text-white text-3xl font-bold shadow-lg 
                       flex flex-col items-center justify-center hover:bg-gray-700 transition-all duration-200
                       shadow-gray-300/50 transform hover:scale-105 relative"
          >
            <span className="text-2xl mb-1 transition-transform duration-200 hover:scale-110">✋</span>
            <span className="transition-transform duration-200 hover:scale-110">CANCEL</span>
            {/* Active indicator with enhanced animation */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-3 h-3 bg-red-300 rounded-full animate-ping"></div>
            </div>
            {/* Breathing effect for active state */}
            <div className="absolute inset-0 rounded-full bg-gray-500 animate-pulse opacity-20"></div>
          </button>
        ) : null}
      </section>

      {/* Enhanced Alarm Toggle */}
      <div className="text-center mb-8">
        <div className="max-w-sm mx-auto bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={alarmEnabled}
                onChange={(e) => setAlarmEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${
                alarmEnabled ? 'bg-red-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  alarmEnabled ? 'translate-x-6' : 'translate-x-0.5'
                } mt-0.5`}></div>
              </div>
              <span className="text-gray-700 font-medium">Audible Alarm</span>
            </label>
            
            {/* Test Alarm Button */}
            {alarmEnabled && sosState === "idle" && (
              <button
                onClick={async () => {
                  try {
                    const audioContext = await initializeAudioContext();
                    if (audioContext) {
                      audioContextRef.current = audioContext;
                      playAlarmTone();
                      // Show brief feedback
                      setLocationError("🔊 Alarm test played");
                      setTimeout(() => {
                        if (locationError === "🔊 Alarm test played") {
                          setLocationError(null);
                        }
                      }, 2000);
                    } else {
                      setLocationError("⚠️ Audio test failed - check browser audio permissions");
                      setTimeout(() => {
                        if (locationError?.includes("Audio test failed")) {
                          setLocationError(null);
                        }
                      }, 3000);
                    }
                  } catch (error) {
                    console.error("Test alarm error:", error);
                    setLocationError("⚠️ Audio test failed - browser may not support audio");
                    setTimeout(() => {
                      if (locationError?.includes("Audio test failed")) {
                        setLocationError(null);
                      }
                    }, 3000);
                  }
                }}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                🔊 Test
              </button>
            )}
          </div>
          
          <div className="text-xs text-gray-600 text-left">
            {alarmEnabled ? (
              <div className="space-y-1">
                <div>✅ Alarm will sound when SOS is activated</div>
                <div>🔊 Uses maximum device volume</div>
                <div>⚠️ May be loud - test in safe environment</div>
              </div>
            ) : (
              <div>🔇 No alarm will sound during SOS</div>
            )}
          </div>
        </div>
      </div>

      {/* Active SOS Location Details */}
      {sosState === "activated" && userLocation && (
        <div className="max-w-md mx-auto px-6 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span>🚨</span>
              <span>SOS Active - Location Tracking</span>
            </h3>
            <div className="space-y-2 text-sm text-red-800">
              <div className="flex justify-between">
                <span>Latitude:</span>
                <span className="font-mono">{userLocation.lat.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Longitude:</span>
                <span className="font-mono">{userLocation.lng.toFixed(6)}</span>
              </div>
              {userLocation.accuracy && (
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span>±{Math.round(userLocation.accuracy)}m</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GPS Signal:</span>
                <span className={`font-semibold ${
                  gpsSignalStrength === 'strong' ? 'text-green-600' :
                  gpsSignalStrength === 'weak' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {gpsSignalStrength.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className={`font-semibold ${
                  networkStatus === 'online' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {networkStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Alarm:</span>
                <span className={`font-semibold ${
                  alarmEnabled ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {alarmEnabled ? '🔊 ACTIVE' : '🔇 OFF'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-red-200">
              <a
                href={`https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-700 hover:text-red-800 underline text-sm"
              >
                📍 View on Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {sosState === "idle" && (
        <div className="max-w-md mx-auto px-6 mb-8 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tap SOS to start 5-second countdown</li>
              <li>• Cancel anytime during countdown</li>
              <li>• When activated, your location is shared</li>
              <li>• Emergency contacts are notified</li>
              <li>• Location updates every 5 seconds</li>
            </ul>
          </div>
          
          {/* Emergency Contacts Link */}
          <div className="text-center">
            <a
              href="/emergency-contacts"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <span>📞</span>
              <span>Manage Emergency Contacts</span>
            </a>
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <footer className="text-center text-gray-500 text-xs pb-8 px-6 mt-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="font-semibold text-yellow-800 mb-1">⚠️ Important</p>
          <p className="text-yellow-700">
            SafeHER SOS is a community tool and does not replace emergency services. 
            If you're in immediate danger, call your local emergency number (911, 999, etc.) first.
          </p>
        </div>
      </footer>
    </main>
  );
}
