/**
 * fetchWithRetry — Drop-in replacement for `fetch()` that automatically
 * retries on network errors (ERR_NETWORK_CHANGED, ERR_CONNECTION_RESET, etc.)
 *
 * Only retries on TypeError (network-level failures), NOT on HTTP error codes.
 * Uses exponential back-off: 800ms → 1600ms → 3200ms
 */

const RETRY_DEFAULTS = { retries: 3, baseDelay: 800 };

export async function fetchWithRetry(url, options = {}, config = {}) {
    const { retries, baseDelay } = { ...RETRY_DEFAULTS, ...config };

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response; // success — pass through (even 4xx/5xx)
        } catch (err) {
            lastError = err;

            // Only retry on network-level errors (TypeError: Failed to fetch)
            if (err instanceof TypeError && attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(
                    `[fetchWithRetry] Attempt ${attempt + 1}/${retries} failed for ${url} — retrying in ${delay}ms`,
                    err.message
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw err; // non-retryable error or out of retries
            }
        }
    }

    throw lastError;
}

export default fetchWithRetry;
