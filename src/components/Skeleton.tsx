import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded ${className}`} />
  );
};

export const BookCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-4 flex gap-4 shadow-sm h-full w-full">
      <Skeleton className="w-20 h-28 rounded-xl flex-none" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-4 space-y-2">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
};
