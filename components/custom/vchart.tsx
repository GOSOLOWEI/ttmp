"use client";

import { useEffect, useRef } from 'react';
import VChart from '@visactor/vchart';

export interface VChartProps {
  spec: any;
  className?: string;
  width?: number;
  height?: number;
}

export function VChartComponent({ 
  spec, 
  className,
  width = 600,
  height = 400 
}: VChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<VChart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = new VChart(spec, {
      dom: containerRef.current,
    });

    chart.renderSync();
    chartRef.current = chart;

    return () => {
      chart.release();
    };
  }, [spec, width, height]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ width, height }}
    />
  );
}