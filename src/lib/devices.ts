import { supabase } from "@/integrations/supabase/client";

const KEY = "wt-device-key";

export function currentDeviceKey(): string {
  let k = localStorage.getItem(KEY);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(KEY, k);
  }
  return k;
}

export function describeDevice(ua: string): string {
  const os = /android/i.test(ua) ? "Android" : /iphone/i.test(ua) ? "iPhone" : /ipad/i.test(ua) ? "iPad" : /windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "Mac" : /linux/i.test(ua) ? "Linux" : "Device";
  const br = /edg\//i.test(ua) ? "Edge" : /opr\//i.test(ua) ? "Opera" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Browser";
  return `${br} on ${os}`;
}

/** Records (or refreshes) this browser in the signed-in person's device list. */
export async function recordDevice(userId: string) {
  const ua = navigator.userAgent;
  await supabase.from("user_devices").upsert(
    { user_id: userId, device_key: currentDeviceKey(), label: describeDevice(ua), user_agent: ua, last_seen: new Date().toISOString() },
    { onConflict: "user_id,device_key" },
  );
}
