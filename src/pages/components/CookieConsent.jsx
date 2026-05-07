import React, { useState } from 'react';

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsent({ onConsent }) {
    // Controls whether the cookie category detail panel is visible
    const [showDetails, setShowDetails] = useState(false);

    return (
        /* WCAG 1.3.1 Info and Relationships, WAI landmarks: expose the banner as a dialog so assistive tech announces it on appearance. */
        <div
            role="dialog"
            aria-modal="false"
            aria-label="Cookie consent"
            aria-describedby="cookie-consent-desc"
            className="cookie-consent-banner"
        >
            <div className="cookie-consent-inner">
                <div className="cookie-consent-text">
                    <p id="cookie-consent-desc" className="cookie-consent-description">
                        This site uses cookies. The authentication cookie is strictly necessary for the site to function.
                        There are no analytics or advertising cookies.
                    </p>
                    {/* WCAG 4.1.2 Name, Role, Value: toggle button exposes its expanded state. */}
                    <button
                        type="button"
                        className="cookie-consent-details-toggle"
                        aria-expanded={showDetails}
                        aria-controls="cookie-consent-details"
                        onClick={() => setShowDetails((s) => !s)}
                    >
                        {showDetails ? 'Hide details ▲' : 'Show details ▼'}
                    </button>
                    {showDetails && (
                        <div id="cookie-consent-details" className="cookie-consent-details">
                            <div className="cookie-consent-category">
                                <div className="cookie-consent-category-header">
                                    <strong>Necessary</strong>
                                    {/* Required: always active — this cookie cannot be declined */}
                                    <span className="cookie-consent-required-badge">Always active</span>
                                </div>
                                <p>
                                    The authentication cookie (jwt) keeps you logged in across page loads.
                                    Without it, login, group creation, and all protected features are unavailable.
                                    This cookie cannot be disabled.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="cookie-consent-actions">
                    <button
                        type="button"
                        className="cookie-consent-btn cookie-consent-btn-accept"
                        onClick={() => { localStorage.setItem(STORAGE_KEY, 'necessary'); onConsent('necessary'); }}
                    >
                        Accept Necessary Cookies
                    </button>
                </div>
            </div>
        </div>
    );
}

// Read stored consent value — returns 'necessary' once accepted, or null if not yet set
export const getStoredConsent = () => localStorage.getItem(STORAGE_KEY);
