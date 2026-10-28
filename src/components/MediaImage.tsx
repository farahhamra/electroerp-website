import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import { useText } from '../core/i18n/useText'
export function MediaImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const t = useText(),
    ref = useRef<HTMLImageElement>(null),
    [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    if (ref.current?.complete && !ref.current.naturalWidth) setFailed(true)
  }, [props.src])
  if (failed)
    return props.alt === '' ? null : (
      <div
        className="media-fallback"
        role="img"
        aria-label={props.alt ?? t('Image unavailable')}
        style={{
          aspectRatio: `${Number(props.width) || 4}/${Number(props.height) || 3}`,
          maxWidth: props.width,
        }}
      >
        <ImageOff aria-hidden="true" />
        <span>{t('Image unavailable')}</span>
      </div>
    )
  return (
    <img
      {...props}
      ref={ref}
      onError={(event) => {
        setFailed(true)
        props.onError?.(event)
      }}
    />
  )
}
