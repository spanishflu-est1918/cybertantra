interface LoadingBarProps {
  progress: number;
  message: string;
}

export default function LoadingBar({ progress, message }: LoadingBarProps) {
  const blocks = 20;
  const filled = Math.floor((progress / 100) * blocks);
  
  return (
    <div className="mb-4">
      <div className="mb-2">{message}</div>
      <div className="flex items-center gap-2 font-mono">
        <span>[</span>
        <div className="flex">
          {Array.from({ length: blocks }).map((_, i) => (
            <span key={i} className={i < filled ? 'text-green-400' : 'text-gray-700'}>
              █
            </span>
          ))}
        </div>
        <span>]</span>
        <span className="ml-2 w-12 text-right">{Math.floor(progress)}%</span>
      </div>
    </div>
  );
}