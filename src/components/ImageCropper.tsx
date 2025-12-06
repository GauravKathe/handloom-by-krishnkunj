import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Crop as CropIcon, RotateCcw, Check } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedBlob: Blob, dimensions: { width: number; height: number }) => void;
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  open,
  onClose,
  imageFile,
  onCropComplete,
  aspectRatio: initialAspectRatio = 16 / 9,
  targetWidth: initialTargetWidth = 1280,
  targetHeight: initialTargetHeight = 720,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSrc, setImageSrc] = useState<string>("");
  const [targetWidth, setTargetWidth] = useState(initialTargetWidth);
  const [targetHeight, setTargetHeight] = useState(initialTargetHeight);
  const [horizontalDpi, setHorizontalDpi] = useState(96);
  const [verticalDpi, setVerticalDpi] = useState(96);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  // Load image when file changes
  useState(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  });

  // Reset when dialog opens with new file
  if (imageFile && !imageSrc) {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }

  const handleClose = () => {
    setImageSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  const handleDimensionChange = (width: number, height: number) => {
    setTargetWidth(width);
    setTargetHeight(height);
    const newAspectRatio = width / height;
    setAspectRatio(newAspectRatio);
    if (imgRef.current) {
      const { width: imgWidth, height: imgHeight } = imgRef.current;
      setCrop(centerAspectCrop(imgWidth, imgHeight, newAspectRatio));
    }
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate actual crop dimensions on the original image
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    // Set canvas to target dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw the cropped and scaled image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob, { width: targetWidth, height: targetHeight });
          handleClose();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Crop Banner Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          {/* Dimension Settings */}
          <div className="mb-4 p-4 bg-muted rounded-lg space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Width (px)</Label>
                <Input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => handleDimensionChange(parseInt(e.target.value) || 1280, targetHeight)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Height (px)</Label>
                <Input
                  type="number"
                  value={targetHeight}
                  onChange={(e) => handleDimensionChange(targetWidth, parseInt(e.target.value) || 720)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">H. Resolution (dpi)</Label>
                <Input
                  type="number"
                  value={horizontalDpi}
                  onChange={(e) => setHorizontalDpi(parseInt(e.target.value) || 96)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">V. Resolution (dpi)</Label>
                <Input
                  type="number"
                  value={verticalDpi}
                  onChange={(e) => setVerticalDpi(parseInt(e.target.value) || 96)}
                  className="h-9"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={resetCrop} className="w-full h-9">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Dimensions: {targetWidth} × {targetHeight} | Aspect Ratio: {(targetWidth / targetHeight).toFixed(2)}:1
            </div>
          </div>

          {/* Crop Area */}
          <div className="flex justify-center bg-muted/50 rounded-lg p-2">
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-h-[50vh]"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[50vh] object-contain"
                />
              </ReactCrop>
            )}
          </div>

          {/* Instructions */}
          <p className="mt-3 text-sm text-muted-foreground text-center">
            Drag to position the crop area. The image will be resized to {targetWidth}×{targetHeight}px.
          </p>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCropComplete} disabled={!completedCrop}>
            <Check className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}