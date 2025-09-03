// Returns a Blob cropped from an image src using pixel crop box (x,y,width,height)
export async function getCroppedBlob(imageSrc, cropPixels, mime = "image/jpeg", quality = 0.92) {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
  
    const { x, y, width, height } = cropPixels;
  
    canvas.width = width;
    canvas.height = height;
  
    ctx.drawImage(
      image,
      x, y, width, height,   // source
      0, 0, width, height    // destination
    );
  
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        mime,
        quality
      );
    });
  }
  
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  