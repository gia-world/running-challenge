/**
 * 1:1 square thumbnail for a feed card — one photo fills the square, more
 * than one lays out as a collage. Purely presentational; the caller wraps
 * it in whatever makes it navigate to the activity's detail page.
 */
export function FeedPhotoThumbnail({
  photoUrls,
  alt,
}: {
  photoUrls: string[];
  alt: string;
}) {
  if (photoUrls.length === 0) return null;

  return (
    <div className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted">
      {photoUrls.length === 1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrls[0]} alt={alt} className="col-span-2 row-span-2 h-full w-full object-cover" />
      ) : photoUrls.length === 2 ? (
        photoUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={`${alt} ${i + 1}`} className="row-span-2 h-full w-full object-cover" />
        ))
      ) : photoUrls.length === 3 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrls[0]} alt={`${alt} 1`} className="row-span-2 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrls[1]} alt={`${alt} 2`} className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrls[2]} alt={`${alt} 3`} className="h-full w-full object-cover" />
        </>
      ) : (
        photoUrls.slice(0, 4).map((url, i) => (
          <div key={url} className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
            {i === 3 && photoUrls.length > 4 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                +{photoUrls.length - 4}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
