import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: { height: 32, width: 32 },
  md: { height: 48, width: 48 },
  lg: { height: 80, width: 80 },
};

export function BrandLogo({
  size = "md",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const dimensions = sizeMap[size];

  return (
    <Image
      src="/brand/logo.png"
      alt="Mindanao State University Logo"
      height={dimensions.height}
      width={dimensions.width}
      className={`object-contain drop-shadow-sm ${className}`}
      priority={priority}
    />
  );
}
