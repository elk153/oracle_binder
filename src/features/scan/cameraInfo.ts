// What the current camera delivers and supports, for the debug panel and the
// OCR reliability study (D-062 follow-up). Read-only: nothing is changed.

export type NumberRange = { min: number; max: number };

export type CameraInfo = {
  label: string; // e.g. "Back Camera", "Back Dual Wide Camera"
  deviceId: string;
  width: number;
  height: number;
  frameRate: number | null;
  // Supported features. null when the browser does not report them.
  zoom: NumberRange | null;
  focusModes: string[] | null;
  focusDistance: NumberRange | null;
  torch: boolean | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toRange(value: unknown): NumberRange | null {
  return isRecord(value) && typeof value.min === "number" && typeof value.max === "number"
    ? { min: value.min, max: value.max }
    : null;
}

function toStrings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

// Capabilities such as zoom and torch are not in TypeScript's DOM types yet,
// and getCapabilities() is missing in older browsers, so everything is read
// as unknown and checked.
export function describeCamera(stream: MediaStream): CameraInfo | null {
  const [track] = stream.getVideoTracks();
  if (!track) {
    return null;
  }
  const settings = track.getSettings();
  const capabilities: unknown =
    typeof track.getCapabilities === "function" ? track.getCapabilities() : null;
  const caps = isRecord(capabilities) ? capabilities : {};
  return {
    label: track.label,
    deviceId: settings.deviceId ?? "",
    width: settings.width ?? 0,
    height: settings.height ?? 0,
    frameRate: settings.frameRate ?? null,
    zoom: toRange(caps.zoom),
    focusModes: toStrings(caps.focusMode),
    focusDistance: toRange(caps.focusDistance),
    torch: typeof caps.torch === "boolean" ? caps.torch : Array.isArray(caps.torch) ? caps.torch.includes(true) : null,
  };
}

// The cameras the browser offers. Labels are only filled in after camera
// permission was granted.
export async function listCameras(): Promise<Array<{ deviceId: string; label: string }>> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
    }));
}
