import React, { useState } from 'react';

const ConsentManager = () => {
  const [consentGiven, setConsentGiven] = useState(false);

  const handleConsent = () => {
    setConsentGiven(true);
    localStorage.setItem('userConsent', 'true');
  };

  if (consentGiven || localStorage.getItem('userConsent') === 'true') {
    return null;
  }

  return (
    <div className="consent-banner">
      <p>We use cookies to improve your experience. By using our site, you agree to our privacy policy.</p>
      <button onClick={handleConsent}>Accept</button>
    </div>
  );
};

export default ConsentManager;