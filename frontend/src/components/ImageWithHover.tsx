import { useState } from 'react';

interface ImageWithHoverProps {
    src: string;
    alt: string;
    className?: string;
    fallbackText?: string;
    showName?: boolean;
    name?: string;
}

/**
 * Image component with hover zoom functionality
 * Shows enlarged image on hover with smooth animation
 */
export function ImageWithHover({
    src,
    alt,
    className = "w-10 h-10 rounded object-cover border border-gray-200",
    fallbackText = "No img",
    showName = false,
    name
}: ImageWithHoverProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!src || imageError) {
        return (
            <div className={`bg-gray-100 flex items-center justify-center text-gray-400 text-xs ${className}`}>
                {fallbackText}
            </div>
        );
    }

    return (
        <div className="relative inline-block">
            <div
                className="relative cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <img
                    src={src}
                    alt={alt}
                    className={`${className} transition-all duration-200 ${isHovered ? 'ring-2 ring-blue-400' : ''}`}
                    onError={() => setImageError(true)}
                />

                {/* Hover overlay with enlarged image */}
                {isHovered && (
                    <div className="fixed z-50 pointer-events-none">
                        <div
                            className="absolute bg-white rounded-lg shadow-2xl border-2 border-blue-400 p-2 animate-in fade-in zoom-in duration-200"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                minWidth: '200px',
                                maxWidth: '400px',
                            }}
                        >
                            <img
                                src={src}
                                alt={alt}
                                className="w-full h-auto rounded object-contain max-h-96"
                                style={{ maxHeight: '400px' }}
                            />
                            {showName && name && (
                                <div className="mt-2 px-2 py-1 bg-gray-50 rounded text-sm font-medium text-gray-900 text-center">
                                    {name}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Loading skeleton for image
 */
export function ImageSkeleton({ className = "w-10 h-10 rounded" }: { className?: string }) {
    return (
        <div className={`bg-gray-200 animate-pulse ${className}`} />
    );
}
