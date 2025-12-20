// src/hooks/useTestSession.js
import { useCallback, useEffect, useRef, useState } from "react";
import testSessionService from "../services/testSessionService";

/* ---------------- helpers ---------------- */
function getPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const isTablet = /ipad|tablet/.test(ua);
  const isMobile = /mobi|android|iphone/.test(ua);
  if (isTablet) return "tablet";
  if (isMobile) return "mobile";
  return "desktop";
}

function getBrowser() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let version = "0";

  if (/Edg\/([\d.]+)/.test(ua)) {
    browser = "Edge";
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || "0";
  } else if (/Chrome\/([\d.]+)/.test(ua) && !/Edg\//.test(ua)) {
    browser = "Chrome";
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "0";
  } else if (/Firefox\/([\d.]+)/.test(ua)) {
    browser = "Firefox";
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "0";
  } else if (/Version\/([\d.]+)/.test(ua) && /Safari\//.test(ua)) {
    browser = "Safari";
    version = ua.match(/Version\/([\d.]+)/)?.[1] || "0";
  }

  return { browser, browser_version: version };
}

function getDeviceInfo() {
  const { browser, browser_version } = getBrowser();
  return {
    platform: getPlatform(),
    os: navigator.platform || "Unknown",
    browser,
    browser_version,
    screen: `${window.screen.width}x${window.screen.height}`,
    pixel_ratio: window.devicePixelRatio || 1,
    cpu: navigator.hardwareConcurrency || undefined,
    ram: navigator.deviceMemory || undefined,
    touch_support: "ontouchstart" in window,
  };
}

function getLocaleInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || "en",
    languages: navigator.languages || [navigator.language || "en"],
  };
}

// CHỈ query các permission “an toàn” (KHÔNG clipboard)
async function getPermissionsSafe() {
  const out = {};
  if (!navigator.permissions?.query) return out;

  const ask = async (name) => {
    try {
      const st = await navigator.permissions.query({ name });
      return st.state; // granted | denied | prompt
    } catch {
      return undefined;
    }
  };

  out.location = await ask("geolocation");
  out.notifications = await ask("notifications");
  return out;
}

/* ---------------- hook ---------------- */
export function useTestSession(testResultId) {
  const [sessionId, setSessionId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const cleanupListenersRef = useRef(null);

  const heartbeatRef = useRef(null);
  const bufferRef = useRef([]);
  const flushTimerRef = useRef(null);
  const isFlushingRef = useRef(false);

  const safeNow = () => new Date().toISOString();

  const flush = useCallback(async () => {
    if (!sessionId) return;
    if (isFlushingRef.current) return;

    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    if (!batch.length) return;

    isFlushingRef.current = true;
    try {
      for (const e of batch) {
        try {
          await testSessionService.addBehaviorEvent(sessionId, e.event_type, e.event_data);
        } catch (err) {
          // fail -> trả lại để lần sau gửi tiếp
          bufferRef.current.unshift(e);
          break;
        }
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [sessionId]);

  const recordBehavior = useCallback(
    (event_type, event_data = {}) => {
      if (!sessionId) return;

      bufferRef.current.push({
        event_type,
        event_data: { ...event_data, at: event_data.at || safeNow() },
      });

      // debounce flush ~1.2s
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(async () => {
          flushTimerRef.current = null;
          await flush();
        }, 1200);
      }
    },
    [sessionId, flush]
  );

  const initializeSession = useCallback(async () => {
    if (!testResultId) return;
    if (isTracking) return;

    const device = getDeviceInfo();
    const locale = getLocaleInfo();
    const permissions = await getPermissionsSafe();

    const session = await testSessionService.createTestSession({
      test_result_id: testResultId,
      device,
      locale,
      permissions,
    });

    // Extract session ID from response structure
    const sessionData = session?.data?.session || session?.session || session;
    const sid = sessionData?._id || sessionData?.id;
    if (!sid) {
      console.error('Failed to get session ID from response:', session);
      return;
    }

    setSessionId(sid);
    setIsTracking(true);

    // heartbeat để BE không mark abandoned
    heartbeatRef.current = setInterval(() => {
      testSessionService.heartbeat(sid).catch(() => {});
    }, 25000);

    // listeners: blur/focus/visibility/reload/copy/paste (NO clipboard-read)
    const onVisibility = () => {
      recordBehavior("visibility_changes", { state: document.visibilityState });
    };

    const onBlur = () => recordBehavior("tab_blur", { action: "blur" });
    const onFocus = () => recordBehavior("tab_blur", { action: "focus" });

    const onBeforeUnload = () => {
      // best-effort: ghi 1 event “reloads”
      // (không await được ở đây)
      recordBehavior("reloads", { reason: "beforeunload" });
      // flush sync là không chắc, nên chỉ log.
    };

    // Copy/paste events: KHÔNG ĐỌC clipboard bằng API -> không popup
    const onCopy = () => {
      const txt = String(window.getSelection?.() || "");
      recordBehavior("clipboard_events", {
        type: "copy",
        text_length: txt.length,
        source: "internal",
      });
    };

    const onPaste = (e) => {
      const pasted = e.clipboardData?.getData("text") || "";
      recordBehavior("clipboard_events", {
        type: "paste",
        text_length: pasted.length,
        source: "external",
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);

    cleanupListenersRef.current = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  }, [testResultId, isTracking, recordBehavior]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // flush hết event trước
      await flush();
      await testSessionService.endTestSession(sessionId);
    } finally {
      setIsTracking(false);

      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    }
  }, [sessionId, flush]);

  useEffect(() => {
    return () => {
      if (cleanupListenersRef.current) cleanupListenersRef.current();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  return { sessionId, isTracking, initializeSession, endSession, recordBehavior };
}
