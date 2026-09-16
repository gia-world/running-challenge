export function PhotoCarousel({ photoUrls, alt }: { photoUrls: string[]; alt: string }) {
  if (photoUrls.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrls[0]} alt={alt} className="aspect-square w-full object-cover" />
    );
  }

  return (
    <div className="flex aspect-square w-full snap-x snap-mandatory gap-1 overflow-x-auto">
      {photoUrls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`${alt} ${index + 1}/${photoUrls.length}`}
          className="h-full w-full flex-shrink-0 snap-center object-cover"
        />
      ))}
    </div>
  );
}
