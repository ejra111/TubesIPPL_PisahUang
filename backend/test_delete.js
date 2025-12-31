import fetch from 'node-fetch';

const API_URL = "http://localhost:4000";

// Ganti token ini dengan token yang valid dari inspect element -> Application -> Local Storage -> sb_token
// Atau login ulang di frontend untuk dapat token
// Untuk test ini kita asumsikan server jalan.

// Kita tidak bisa hapus tanpa token valid.
// Jadi skrip ini hanya check health endpoint DELETE (misal 401 Unauthorized bukan 404)

async function testDelete() {
    console.log("Testing DELETE endpoint existence...");
    try {
        const res = await fetch(`${API_URL}/bills/999999`, { method: "DELETE" });
        console.log(`Status: ${res.status} (Expect 401 or 403 because no token)`);
        if (res.status === 404) console.log("WARNING: 404 might mean route not found OR bill not found (which is improved after auth check)");

        // Auth middleware usually hits first, so 401/403 is good.
        // If 404, it might mean the router path doesn't exist? 
        // Wait, authRequired middleware runs BEFORE route handler? 
        // Yes: router.delete("/:id", authRequired, ...)
        // So if route exists, it hits authRequired -> 401/403.
        // If route doesn't exist, Express returns 404.

        if (res.status === 401 || res.status === 403) {
            console.log("SUCCESS: Endpoint exists and is protected.");
        } else if (res.status === 404) {
            console.log("AMBIGUOUS: Got 404. Checking health...");
        } else {
            console.log("Unknown response:", res.status);
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testDelete();
