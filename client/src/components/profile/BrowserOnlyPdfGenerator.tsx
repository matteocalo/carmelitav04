import React, { useEffect, useState } from 'react';
import ProfilePdfGenerator from './ProfilePdfGenerator';

// This component ensures that the PDF generator only renders in browser environments
// to prevent React hydration errors (Error #301)
const BrowserOnlyPdfGenerator = ({ userData }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only render the PDF generator component when we're in the browser
  if (!isMounted) {
    return null; // Return nothing during server-side rendering or initial mount
  }

  return <ProfilePdfGenerator userData={userData} />;
};

export default BrowserOnlyPdfGenerator;