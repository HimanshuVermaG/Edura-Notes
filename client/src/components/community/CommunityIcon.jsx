import React from 'react';
import * as Icons from 'lucide-react';

export default function CommunityIcon({ name, size = 24, className = "" }) {
  // If the icon name doesn't exist in lucide-react, fallback to Hash
  const IconComponent = Icons[name] || Icons.Hash;
  return <IconComponent size={size} className={className} />;
}
