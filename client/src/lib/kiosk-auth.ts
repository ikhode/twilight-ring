/**
 * Utility to generate authentication headers for Kiosk/Terminal operations.
 * Supports both standard Supabase Auth and Terminal-based hardware binding.
 */
export function getKioskHeaders(options: {
    employeeId?: string | null,
    supabaseToken?: string | null
} = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    // 1. Supabase Auth (if available/required)
    if (options.supabaseToken) {
        headers['Authorization'] = `Bearer ${options.supabaseToken}`;
    }

    // 2. Terminal Hardware Bridge Auth
    const deviceId = localStorage.getItem("kiosk_device_id") || localStorage.getItem("driver_device_id");
    const salt = localStorage.getItem("kiosk_device_salt") || ""; // Some kiosks might not use salt yet

    if (deviceId) {
        // Format: "deviceId:salt"
        headers['X-Device-Auth'] = salt ? `${deviceId}:${salt}` : deviceId;
    }

    // 3. Identified Employee/Driver Context
    const id = options.employeeId || localStorage.getItem("last_auth_employee_id");
    if (id) {
        headers['X-Employee-ID'] = id;
    }

    return headers;
}
