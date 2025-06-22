interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress = ({ progress, size = 28, strokeWidth = 3 }: CircularProgressProps) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          className="text-blue-500"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
      </svg>
      <span className="absolute text-[10px] font-medium text-gray-700 dark:text-white">
        {`${Math.round(progress)}%`}
      </span>
    </div>
  );
}; 