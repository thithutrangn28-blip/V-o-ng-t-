import React, { useState, useEffect } from 'react';
import { getCachedImage } from '../../utils/dexieDB';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const SafeImage = ({ 
  src, 
  alt, 
  className,
  style 
}: SafeImageProps) => {
  const [failed, setFailed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src || null);
  const [isResolving, setIsResolving] = useState(false);

  // Reset failed state if src changes
  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const resolve = async () => {
      if (!src) {
        setResolvedSrc(null);
        return;
      }
      if (typeof src === 'string' && src.startsWith('local-img-')) {
        setIsResolving(true);
        const cached = await getCachedImage(src);
        setResolvedSrc(cached || null);
        setIsResolving(false);
      } else {
        setResolvedSrc(src);
      }
    };
    resolve();
  }, [src]);

  const validSrc = 
    resolvedSrc && 
    typeof resolvedSrc === 'string' && 
    resolvedSrc.trim() !== '' && 
    !failed;

  if (isResolving) {
    return <div className={`animate-pulse bg-pink-50 rounded ${className}`} style={{ width: '100%', height: '100%', ...style }} />;
  }

  if (!validSrc) {
    return (
      <div 
        className={`image-placeholder flex items-center justify-center ${className || ''}`}
        style={{
          background: 'linear-gradient(135deg, #f7dce7, #fff7fb)',
          color: '#c99aaa',
          borderRadius: 'inherit',
          width: '100%',
          height: '100%',
          ...style
        }}
      >
        <span className="text-lg opacity-60">♡</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc!}
      alt={alt || ""}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
        ...style
      }}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
};

export default SafeImage;
