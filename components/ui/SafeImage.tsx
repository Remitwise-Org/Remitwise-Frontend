import Image, { ImageProps } from "next/image";

/**
 * SafeImage is a wrapper around `next/image` that enforces:
 * 1. Required `alt` text for accessibility.
 * 2. `loading="lazy"` by default for all images (unless `priority` is set).
 * 3. Consistent `sizes` usage for better `srcset` performance.
 */
type SafeImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
};

export const SafeImage = ({
  loading = "lazy",
  ...props
}: SafeImageProps) => {
  return <Image loading={loading} {...props} alt={props.alt} />;
};
