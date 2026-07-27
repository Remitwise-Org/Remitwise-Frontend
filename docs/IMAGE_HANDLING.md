# Image handling

This guide is for contributors who add or update images in the UI. The repository uses Next.js image optimization for local assets, and the goal is to keep image delivery fast, responsive, and accessible without relying on tribal knowledge.

## Use the local image pattern

Prefer `next/image` for all UI images. The current app uses local assets from the `public/` directory, so the default pattern should be:

```tsx
import Image from "next/image";

<Image
  src="/logo.svg"
  width={40}
  height={40}
  alt="RemitWise logo"
/>
```

The same approach is already used in [components/Nav/Logo.tsx](../components/Nav/Logo.tsx) and [components/Hero.tsx](../components/Hero.tsx).

## Formats

Use the format that matches the asset:

- `svg` for logos and icons
- `webp` or `avif` for photos and illustrations when the file is optimized for the web
- `jpg` or `png` only when the source asset is already available in that format

For this repository, keep the source files under `public/` and reference them with a path such as `/images/hero.webp`.

## Responsive images and `srcset`

Next.js generates responsive `srcset` values automatically for local images when you use `next/image`. The important part is to provide a realistic `sizes` value so the browser can choose the right candidate.

Use `sizes` for responsive images that change width with the viewport:

```tsx
<Image
  src="/images/hero.webp"
  width={1600}
  height={900}
  alt="A family sending money across borders"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

For smaller fixed elements such as avatars or thumbnails, match the rendered size closely:

```tsx
<Image
  src="/avatars/image1.png"
  width={24}
  height={24}
  alt="User avatar"
  sizes="24px"
/>
```

A good rule of thumb is:

- use `100vw` for full-width hero or banner images
- use `50vw` or `33vw` for split layouts and cards
- use `24px`, `40px`, or another explicit size for small icons and avatars

## Lazy loading strategy

The default behavior in `next/image` is to lazy-load images that are below the fold. Do not add a manual `loading="lazy"` prop unless there is a very specific regression that requires it.

Reserve `priority` for the first visible image on the page, such as the hero visual:

```tsx
<Image
  src="/images/hero.webp"
  width={1600}
  height={900}
  alt="A family sending money across borders"
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

Do not use `priority` on every image. It should be limited to the hero or another above-the-fold asset that needs to load eagerly.

## Layout stability

Always provide width and height for non-`fill` images to prevent layout shift. Use `fill` only when the image is inside a positioned container and you also provide a `sizes` value.

Example for a cropped card image:

```tsx
<div className="relative h-48 w-full">
  <Image
    src="/images/card.webp"
    alt="RemitWise dashboard preview"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 33vw"
  />
</div>
```

## Accessibility

Every image must include an `alt` attribute. The repository already enforces this with the image-alt accessibility check in the lint script.

- Use descriptive alt text for meaningful images.
- Use `alt=""` only for decorative images that do not add information.
- Avoid placeholder text such as `image`, `photo`, or `banner` when the image has a more specific purpose.

## Checklist

Before submitting UI changes, verify that:

- [ ] the image uses `next/image`
- [ ] `alt` is present
- [ ] width and height are set, or `fill` is used with a positioned wrapper
- [ ] `sizes` is present for responsive images
- [ ] `priority` is only used for above-the-fold content
