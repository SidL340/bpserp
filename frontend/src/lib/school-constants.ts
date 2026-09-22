/**
 * Single source of truth for Brindawan Public School defaults.
 * Perfectly mirrored with backend SQLite database School record.
 * Used for instant SSR/initial render fallbacks to prevent any refresh flash or text mismatch.
 */

export interface SchoolInfo {
  id: number;
  name: string;
  nameNepali: string;
  address: string;
  addressNepali: string;
  district: string;
  province: string;
  emisCode: string;
  estYear: string;
  logoUrl: string;
  sealUrl: string;
  phone: string;
  email: string;
  website: string;
  tagline: string;
  taglineNepali: string;
  level: string;
  type: string;
  principalName: string;
}

export const SCHOOL_DEFAULTS: SchoolInfo = {
  id: 1,
  name: 'Brindawan Public School',
  nameNepali: 'बृन्दावन पब्लिक स्कूल',
  address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
  addressNepali: 'बृन्दावन नगरपालिका-०२, विश्रामपुर, रौतहट',
  district: 'Rautahat',
  province: 'Madhesh Province',
  emisCode: 'BPS-320160',
  estYear: '2075',
  logoUrl: '/school_logo.png',
  sealUrl: '/school_logo.png',
  phone: '+977 9800000000',
  email: 'info@bps.edu.np',
  website: 'https://bps.edu.np',
  tagline: 'A Premier Child-Centered English Medium Private School',
  taglineNepali: 'ज्ञान, संस्कार र बाल-केन्द्रित उत्कृष्ट शिक्षाको केन्द्र',
  level: 'Primary & Pre-Primary (PG to Class 5)',
  type: 'Private',
  principalName: 'Principal',
};
