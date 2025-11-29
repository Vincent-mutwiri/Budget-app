import React from 'react';

export const SkeletonCard = () => (
  <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl animate-pulse">
    <div className="h-4 bg-forest-700 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-forest-700 rounded w-2/3 mb-2"></div>
    <div className="h-3 bg-forest-700 rounded w-1/2"></div>
  </div>
);

export const SkeletonTable = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
        <div className="h-4 bg-forest-700 rounded w-20"></div>
        <div className="h-4 bg-forest-700 rounded flex-1"></div>
        <div className="h-4 bg-forest-700 rounded w-24"></div>
        <div className="h-4 bg-forest-700 rounded w-20"></div>
      </div>
    ))}
  </div>
);

export const SkeletonMetric = () => (
  <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl animate-pulse">
    <div className="h-3 bg-forest-700 rounded w-1/2 mb-3"></div>
    <div className="h-8 bg-forest-700 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-forest-700 rounded w-1/3"></div>
  </div>
);