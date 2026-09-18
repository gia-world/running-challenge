export function PhotoCarousel({ photoUrls, alt }: { photoUrls: string[]; alt: string }) {
  if (photoUrls.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrls[0]} alt={alt} className="w-full" />;
  }

  return (
    <div className="flex w-full snap-x snap-mandatory items-start gap-1 overflow-x-auto">
      {photoUrls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`${alt} ${index + 1}/${photoUrls.length}`}
          className="w-full flex-shrink-0 snap-center"
        />
      ))}
    </div>
  );
}
