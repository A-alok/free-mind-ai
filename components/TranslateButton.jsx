'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

const TranslateButton = () => {
  const [showLanguages, setShowLanguages] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const dropdownRef = useRef(null);

  // Indian languages
  const languages = [
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'ur', name: 'اردو (Urdu)' },
    { code: 'en', name: 'English' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLanguages(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  useEffect(() => {
    // Create hidden div for Google Translate
    if (typeof document !== 'undefined') {
      if (!document.getElementById('google_translate_element')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
      }

      // Define initialization function globally
      window.googleTranslateElementInit = () => {
        try {
          if (window.google && window.google.translate) {
            new window.google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: languages.map(lang => lang.code).join(','),
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
            }, 'google_translate_element');
            
            console.log('Google Translate initialized successfully');
            setScriptLoaded(true);
          } else {
            console.error('Google translate object not available');
            setScriptError(true);
          }
        } catch (error) {
          console.error('Error initializing Google Translate:', error);
          setScriptError(true);
        }
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.googleTranslateElementInit = undefined;
      }
    };
  }, []);

  // Direct cookie method to change language
  const changeLanguage = (langCode) => {
    console.log('Changing language to:', langCode);
    
    try {
      if (scriptLoaded) {
        // First try the Google API method
        const selectElement = document.querySelector('.goog-te-combo');
        if (selectElement) {
          console.log('Found select element, changing value to', langCode);
          selectElement.value = langCode;
          selectElement.dispatchEvent(new Event('change'));
        } else {
          // Fall back to cookie method
          console.log('Using cookie method for', langCode);
          const hostname = window.location.hostname;
          
          // For localhost - no domain in the cookie
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            document.cookie = `googtrans=/en/${langCode}; path=/`;
          } else {
            // For custom domains
            const domain = hostname.split('.').slice(-2).join('.');
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${hostname}`;
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${domain}`;
            document.cookie = `googtrans=/en/${langCode}; path=/`;
          }
          
          // Reload the page to apply translation
          window.location.reload();
        }
      } else {
        console.error('Script not loaded yet, cannot change language');
        
        // Force reload approach as last resort
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          document.cookie = `googtrans=/en/${langCode}; path=/`;
        } else {
          const domain = hostname.split('.').slice(-2).join('.');
          document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${hostname}`;
          document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${domain}`;
          document.cookie = `googtrans=/en/${langCode}; path=/`;
        }
        window.location.reload();
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
    
    setShowLanguages(false);
  };

  return (
    <div className="translate-container" ref={dropdownRef}>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Translate script loaded');
          // Allow some time for the Google API to initialize
          setTimeout(() => {
            if (!scriptLoaded && !scriptError) {
              setScriptLoaded(true);
            }
          }, 1000);
        }}
        onError={() => {
          console.error('Failed to load Google Translate script');
          setScriptError(true);
        }}
      />
      
      <button 
        className="translate-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowLanguages(!showLanguages);
          console.log('Translate button clicked, dropdown:', !showLanguages);
        }}
        aria-label="Translate"
      >
        Translate
      </button>
      
      {showLanguages && (
        <div className="languages-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="language-option"
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranslateButton;