import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import socketService from "../services/socketService";
import testSessionService from "../services/testSessionService";

// ✅ normalize API response -> session object
const normalizeSession = (raw) => {
  console.log('🔍 Normalizing session response:', raw);
  
  if (!raw) {
    console.error('❌ Empty response to normalize');
    return null;
  }

  // Handle different response structures
  let sessionData = null;
  
  if (raw.success && raw.data?.session) {
    sessionData = raw.data.session;
  } else if (raw.data?.session) {
    sessionData = raw.data.session;
  } else if (raw.session) {
    sessionData = raw.session;
  } else if (raw.data && typeof raw.data === 'object') {
    sessionData = raw.data;
  } else if (raw._id || raw.id) {
    sessionData = raw;
  }

  if (!sessionData || typeof sessionData !== "object") {
    console.error('❌ Invalid session data structure:', raw);
    return null;
  }

  // Ensure we have an ID
  const id = sessionData._id || sessionData.id || sessionData.session_id;
  if (!id) {
    console.error('❌ Session missing ID field:', sessionData);
    return null;
  }

  const normalized = { ...sessionData, id };
  console.log('✅ Normalized session:', normalized);
  return normalized;
};

export const useTestSession = (testResultId) => {
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Refs
  const sessionRef = useRef(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
    isTrackingRef.current = isTracking;
  }, [session, isTracking]);

  // helper lấy userId chuẩn
  const getUserId = useCallback(() => user?._id || user?.id, [user]);

  // Initialize test session
  const initializeSession = useCallback(async () => {
    const userId = getUserId();

    if (!testResultId || !userId) {
      console.warn("⚠️ Cannot initialize session - missing testResultId or userId:", {
        testResultId,
        userId,
        user,
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("🚀 Initializing test session for:", {
        testResultId,
        userId,
      });

      // Get device/system info
      const device = testSessionService.getDeviceInfo();
      const locale = testSessionService.getLocaleInfo();
      const permissions = await testSessionService.getPermissionsInfo();
      const location = await testSessionService.getLocationInfo();

      const sessionData = {
        user_id: userId, // ✅ required
        test_result_id: testResultId, // ✅ required
        device, // ✅ required
        locale, // ✅ required
        permissions,
        location,
        session_token: `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      };

      console.log("📤 Creating test session with payload:", sessionData);

      // ✅ FIX: Better error handling for API call
      let apiResp;
      try {
        apiResp = await testSessionService.createTestSession(sessionData);
      } catch (apiError) {
        console.error('❌ API call failed:', apiError);
        
        if (apiError.message?.includes('HTML')) {
          throw new Error('Authentication failed - please login again');
        }
        
        throw apiError;
      }

      console.log('📥 Raw API response:', apiResp);
      
      const newSession = normalizeSession(apiResp);
      
      if (!newSession?.id) {
        console.error('❌ Session normalization failed:', {
          apiResp,
          normalized: newSession
        });
        throw new Error("Invalid session response from server");
      }

      setSession(newSession);
      console.log("✅ Test session created:", newSession);

      // Connect socket & join
      socketService.connect();
      
      // ✅ FIX: dùng newSession.id (đã normalize) thay vì newSession?.id undefined
      await socketService.joinTestSession(newSession.id, userId);

      setIsTracking(true);
      console.log("✅ Test session initialized and tracking started:", newSession.id);
      
    } catch (err) {
      console.error("❌ Failed to initialize session:", err);
      setError(err.message || "Failed to initialize test session");
    } finally {
      setIsLoading(false);
    }
  }, [testResultId, user, getUserId]);

  // End test session
  const endSession = useCallback(async () => {
    const s = sessionRef.current;
    const sessionId = s?.id || s?._id;

    if (!sessionId) return;

    try {
      setIsLoading(true);

      // end via socket first
      await socketService.endSession();

      // end via API
      await testSessionService.endTestSession(sessionId);

      setIsTracking(false);
      setSession(null);

      console.log("✅ Test session ended:", sessionId);
    } catch (err) {
      console.error("❌ Failed to end session:", err);
      setError(err.message || "Failed to end test session");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Record behavior events
  const recordBehavior = useCallback((eventType, eventData) => {
    if (!isTrackingRef.current) return;

    try {
      socketService.recordBehavior(eventType, eventData);
    } catch (err) {
      console.error("❌ Failed to record behavior:", err);
    }
  }, []);

  // Update location
  const updateLocation = useCallback((locationData) => {
    if (!isTrackingRef.current || !sessionRef.current) return;

    try {
      socketService.updateLocation(locationData);
    } catch (err) {
      console.error("❌ Failed to update location:", err);
    }
  }, []);

  // Update session status
  const updateStatus = useCallback((status) => {
    if (!isTrackingRef.current || !sessionRef.current) return;

    try {
      socketService.updateSessionStatus(status);
    } catch (err) {
      console.error("❌ Failed to update status:", err);
    }
  }, []);

  // Flag session
  const flagSession = useCallback((flagType, reason = "") => {
    if (!sessionRef.current) return;

    try {
      socketService.flagSession(flagType, reason);
    } catch (err) {
      console.error("❌ Failed to flag session:", err);
    }
  }, []);

  // Tab visibility tracking
  useEffect(() => {
    if (!isTracking) return;

    let hiddenStartTime = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenStartTime = Date.now();
      } else {
        if (hiddenStartTime) {
          const duration = Date.now() - hiddenStartTime;
          recordBehavior("tab_blur", {
            at: new Date(hiddenStartTime),
            duration_ms: duration,
          });
          hiddenStartTime = null;
        }
      }

      recordBehavior("visibility_changes", {
        at: new Date(),
        state: document.hidden ? "hidden" : "visible",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTracking, recordBehavior]);

  // Window blur/focus tracking
  useEffect(() => {
    if (!isTracking) return;

    let blurStartTime = null;

    const handleWindowBlur = () => {
      blurStartTime = Date.now();
    };

    const handleWindowFocus = () => {
      if (blurStartTime) {
        const duration = Date.now() - blurStartTime;
        recordBehavior("tab_blur", {
          at: new Date(blurStartTime),
          duration_ms: duration,
        });
        blurStartTime = null;
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isTracking, recordBehavior]);

  // Reload tracking
  useEffect(() => {
    if (!isTracking) return;

    const handleBeforeUnload = () => {
      recordBehavior("reloads", { at: new Date() });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTracking, recordBehavior]);

  // Clipboard tracking
  useEffect(() => {
    if (!isTracking) return;

    const handleClipboard = async (event) => {
      try {
        let text = "";
        const type = event.type;

        if (event.type === "paste") {
          text = event.clipboardData?.getData("text") || "";
        } else if (event.type === "copy" || event.type === "cut") {
          text = "[content hidden]";
        }

        recordBehavior("clipboard_events", {
          at: new Date(),
          type,
          text,
          text_length: text.length,
          source: "internal",
        });
      } catch (err) {
        console.error("Clipboard tracking error:", err);
      }
    };

    document.addEventListener("paste", handleClipboard);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("cut", handleClipboard);

    return () => {
      document.removeEventListener("paste", handleClipboard);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
    };
  }, [isTracking, recordBehavior]);

  // Location tracking (every 30 seconds)
  useEffect(() => {
    if (!isTracking) return;

    const locationInterval = setInterval(async () => {
      try {
        const locationData = await testSessionService.getLocationInfo();
        if (locationData.enabled && locationData.history?.length > 0) {
          updateLocation(locationData.history[0]);
        }
      } catch (err) {
        console.error("Location tracking error:", err);
      }
    }, 30000);

    return () => clearInterval(locationInterval);
  }, [isTracking, updateLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTrackingRef.current) {
        socketService.endSession().catch(console.error);
      }
    };
  }, []);

  return {
    session,
    isLoading,
    error,
    isTracking,
    initializeSession,
    endSession,
    recordBehavior,
    updateLocation,
    updateStatus,
    flagSession,
    socketStatus: socketService.getStatus(),
  };
};

export default useTestSession;
