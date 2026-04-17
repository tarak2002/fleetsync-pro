import { Car } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

export function LoadingScreen({ message = 'Loading Application...', fullScreen = true }: LoadingScreenProps) {
    return (
        <div className={`flex items-center justify-center ${fullScreen ? 'h-screen w-screen bg-slate-50' : 'h-64 w-full'}`}>
            <div className="text-center">
                <div className="relative w-32 h-12 mx-auto mb-4 overflow-hidden">
                    {/* Road */}
                    <div className="absolute bottom-1 left-0 w-full h-1 animate-road" />
                    {/* Car */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                        <Car className="w-8 h-8 text-primary animate-car-travel" />
                    </div>
                </div>
                <p className="text-slate-500 text-sm font-medium tracking-wide animate-pulse">{message}</p>
            </div>
        </div>
    );
}
